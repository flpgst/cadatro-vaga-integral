import Endereco from '../models/Endereco';
import Inscricao from '../models/Inscricao';
import MembroFamilia from '../models/MembroFamilia';
import { findInscricao, findMatriculaById } from '../util/finders';
import { cpf } from 'cpf-cnpj-validator';
import ErrorHandler from '../util/error';

class InscricaoController {
  async store(req, res, next) {
    try {
      const inscricao = req.body;
      const matricula = await findMatriculaById(inscricao.matricula_id);

      const {
        logradouro,
        numero,
        complemento,
        bairro,
        cep,
        cidade_id,
        id,
      } = matricula.dataValues.pessoa.dataValues.endereco.dataValues;

      const endereco = [
        logradouro,
        numero,
        complemento,
        bairro,
        cep,
        id,
        cidade_id,
      ];

      if (endereco.find((campo) => campo !== inscricao.endereco[campo])) {
        await Endereco.update(
          {
            logradouro: inscricao.endereco.logradouro,
            numero: inscricao.endereco.numero,
            complemento: inscricao.endereco.complemento,
            bairro: inscricao.endereco.bairro,
            cep: inscricao.endereco.cep,
            cidade_id: inscricao.endereco.cidade_id,
          },
          {
            where: {
              id,
            },
          }
        );
      }

      if (
        !req.superAdmin &&
        req.unidadeEnsinoId !== matricula.dataValues.unidadeEnsinoId
      )
        throw new ErrorHandler(
          401,
          'Você não tem permissão para cadastrar esta matrícula'
        );

      if (await findInscricao(inscricao.matricula_id))
        throw new ErrorHandler(
          401,
          'Já existe uma inscrição para esta matrícula'
        );

      const invalidCPF = inscricao.membros.find(
        (membro) => membro.cpf && !cpf.isValid(membro.cpf)
      );

      const invalidCertidaoNascimento = inscricao.membros.find(
        (membro) =>
          membro.certidao_nascimento &&
          String(membro.certidao_nascimento).length !== 32
      );

      if (invalidCPF) throw new ErrorHandler(401, 'CPF inválido');

      if (invalidCertidaoNascimento)
        throw new ErrorHandler(401, 'Certidão de nascimento inválida');

      try {
        const renda_percapta = (
          inscricao.membros.reduce(
            (renda, membro) => (renda += membro.renda || 0),
            0
          ) /
          (inscricao.membros.length + 1)
        ).toFixed(2);

        let inscricaoCreated = await Inscricao.create({
          ...inscricao,
          renda_percapta,
          pessoa_criacao: req.pessoaId,
        });

        inscricaoCreated.dataValues.membroFamilia = [];

        for await (let membro of inscricao.membros) {
          let endereco;
          if (membro.endereco)
            endereco = await Endereco.create({
              ...membro.endereco,
            });
          const membroFamilia = await MembroFamilia.create({
            ...membro,
            inscricao_id: inscricaoCreated.dataValues.id,
            endereco_id:
              endereco?.id ||
              matricula.dataValues.pessoa.dataValues.endereco.dataValues.id,
          });

          inscricaoCreated.dataValues.membroFamilia.push(
            membroFamilia.dataValues
          );
        }

        return res.status(200).json(inscricaoCreated);
      } catch (error) {
        return res.status(error.status).json({ message: error });
      }
    } catch (error) {
      next(error);
    }
  }

  async index(req, res, next) {
    try {
      if (!req.superAdmin && !req.gestor)
        throw new ErrorHandler(401, 'Não autorizado');

      const inscricoes = await Inscricao.findAll({
        where: { ativo: true },
        include: {
          all: true,
          nested: true,
        },
      });

      return res.status(200).json(inscricoes);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const { deferido, posicao } = req.body;
      const { id } = req.params;

      try {
        const inscricao = await Inscricao.findByPk(id, {
          where: { ativo: true },
        });
        inscricao.deferido = deferido ?? inscricao.deferido;
        inscricao.posicao = posicao ?? inscricao.posicao;
        await inscricao.save();
        return res.json(inscricao);
      } catch (error) {
        throw new ErrorHandler(error.status, error.message);
      }
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res) {
    const { id } = req.params;

    const inscricao = await Inscricao.findOne({
      where: { id, ativo: true },
      include: { nested: true, all: true },
    });

    return inscricao ? res.json(inscricao) : res.end();
  }
}
export default new InscricaoController();
