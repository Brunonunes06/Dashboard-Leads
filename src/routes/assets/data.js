// Shared mock data
window.APP_DATA = (function(){
  const STATUS_LABEL = {
    novo:'Novo',qualificando:'Qualificando',qualificado:'Qualificado',
    transferido:'Transferido',descartado:'Descartado'
  };

  const leads = [
    {id:'1',name:'Marina Albuquerque',phone:'+55 11 98123-4521',source:'Anúncio Instagram — Cobertura Vila Madalena',property:'Cobertura 3 quartos — Vila Madalena',status:'qualificado',budget:'R$ 2,5M – R$ 3M',bedrooms:'3',region:'Vila Madalena, Pinheiros',intent:'Mudança em 90 dias',score:92,lastMessage:'Perfeito! Posso visitar sábado de manhã?',lastActivity:'agora',unread:2,responseTime:'3s',messages:[
      {sender:'lead',text:'Oi, vi o anúncio da cobertura na Vila Madalena. Ainda está disponível?',time:'14:02'},
      {sender:'ai',text:'Olá Marina! 👋 Sim, a cobertura ainda está disponível. Posso te ajudar com algumas informações rápidas? Qual a faixa de orçamento que você considera?',time:'14:02'},
      {sender:'human',text:'Estou olhando entre 2.5 e 3 milhões',time:'14:04'},
    ]}
  ];

  const weeklyData = [
    {day:'Seg',leads:50,qualificados:30},
    {day:'Ter',leads:24,qualificados:11},
    {day:'Qua',leads:10,qualificados:14},
    {day:'Qui',leads:27,qualificados:12},
    {day:'Sex',leads:42,qualificados:19},
    {day:'Sáb',leads:35,qualificados:16},
    {day:'Dom',leads:22,qualificados:9},
  ];

  const sources = [
    {name:'Instagram Ads',value:10,color:'#34d399'},
    {name:'Google Ads',value:20,color:'#22d3ee'},
    {name:'Facebook Ads',value:50,color:'#fbbf24'},
    {name:'Site/Orgânico',value:80,color:'#c084fc'},
  ];

  return { leads, weeklyData, sources, STATUS_LABEL };
})();
