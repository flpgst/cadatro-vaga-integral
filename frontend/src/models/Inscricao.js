export default class Inscricao {
  constructor(
    matricula_id,
    membros,
    transporte_proprio,
    vulnerabilidade_social,
    processo_judicial
  ) {
    this.matricula_id = matricula_id;
    this.membros = membros.map(
      ({ nome, workplace, income: renda, kinship, endereco }) => ({
        nome,
        local_trabalho: workplace.name,
        horario_trabalho_inicio: workplace.start,
        horario_trabalho_fim: workplace.end,
        telefone_trabalho: workplace.phone,
        renda,
        parentesco_id: kinship.id,
        endereco
      })
    );
    this.transporte_proprio = transporte_proprio;
    this.vulnerabilidade_social = vulnerabilidade_social;
    this.processo_judicial = processo_judicial;
  }
}
