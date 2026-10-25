export default ({ env }) => ({
  // Mail is sent through the site's Gmail account (an app password). The provider hands
  // providerOptions to nodemailer's createTransport unchanged. Without credentials the
  // server still starts; sending then fails, which the contact form records.
  email: {
    config: {
      provider: 'nodemailer',
      providerOptions: {
        service: 'gmail',
        auth: {
          user: env('SMTP_USERNAME'),
          pass: env('SMTP_PASSWORD'),
        },
      },
      settings: {
        defaultFrom: env('SMTP_USERNAME'),
        defaultReplyTo: env('SMTP_USERNAME'),
      },
    },
  },
});
