const {RecaptchaEnterpriseServiceClient} = require('@google-cloud/recaptcha-enterprise');

/**
  * Crie uma avaliação para analisar o risco de uma ação da interface.
  *
  * projectID: O ID do seu projeto do Google Cloud.
  * recaptchaSiteKey: A chave reCAPTCHA associada ao site/app
  * token: O token gerado obtido do cliente.
  * recaptchaAction: Nome da ação correspondente ao token.
  */
async function createAssessment({
  // O que fazer: substitua o token e as variáveis de ação reCAPTCHA antes de executar a amostra.
  projectID = "PROJT-ID",
  recaptchaKey = "RCPkey",
  token = "TKN",
  recaptchaAction = "RTC",
}) {
  // Crie o cliente reCAPTCHA.
  // TODO: armazena em cache o código de geração do cliente (recomendado) ou a chamada client.close() antes de sair do método.
  const client = new RecaptchaEnterpriseServiceClient();
  const projectPath = client.projectPath(projectID);

  // Crie a solicitação de avaliação.
  const request = ({
    assessment: {
      event: {
        token: token,
        siteKey: recaptchaKey,
      },
    },
    parent: projectPath,
  });

  const [ response ] = await client.createAssessment(request);

  // Verifique se o token é válido.
  if (!response.tokenProperties.valid) {
    console.log(`The CreateAssessment call failed because the token was: ${response.tokenProperties.invalidReason}`);
    return null;
  }

  // Verifique se a ação esperada foi executada.
  // The `action` property is set by user client in the grecaptcha.enterprise.execute() method.
  if (response.tokenProperties.action === recaptchaAction) {
    // Consulte a pontuação de risco e os motivos.
    // Para mais informações sobre como interpretar a avaliação, acesse:
    // https://cloud.google.com/recaptcha/docs/interpret-assessment
    console.log(`The reCAPTCHA score is: ${response.riskAnalysis.score}`);
    response.riskAnalysis.reasons.forEach((reason) => {
      console.log(reason);
    });

    return response.riskAnalysis.score;
  } else {
    console.log("The action attribute in your reCAPTCHA tag does not match the action you are expecting to score");
    return null;
  }
}