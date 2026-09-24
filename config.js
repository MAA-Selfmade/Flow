// Flow — opsætning.
window.FLOW_CONFIG = {
  firebase: {
    apiKey: "AIzaSyCz_o_SzIyjvnSiBixLq-j3EEv6qi2KqPM",
    authDomain: "flow-bcbda.firebaseapp.com",
    projectId: "flow-bcbda",
    appId: "1:588171693312:web:e7f8dc71da0599ea84f7e5"
  },
  // Administratorer: logger ind uden godkendelse og godkender nye brugere under "Team".
  // Skal også stå i firestore.rules.
  admins: ["maa@selfmade.com"],
  // Engangs-kobling ved opstart: person-ID fra importen → e-mail. Rør ikke, når det er gjort.
  bootstrapEmails: { u1: "lkk@selfmade.com", u2: "dtv@selfmade.com", u3: "maa@selfmade.com" },
  // reCAPTCHA v3 site key til App Check (se OPSÆTNING.md). Tom = ingen App Check.
  recaptchaSiteKey: "6LfQg8wtAAAAAG6QvF9zuZQXXmT0avgzO8FF90Wk",
  // Teams-URL ligger IKKE her (filen er offentlig). Den gemmes under Team i appen.
  teamsWebhookUrl: ""
};
