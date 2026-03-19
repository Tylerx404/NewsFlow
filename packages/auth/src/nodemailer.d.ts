declare module "nodemailer" {
  interface CreateTransportOptions {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  }

  interface SendMailOptions {
    from: string;
    to: string;
    subject: string;
    text: string;
    html?: string;
  }

  interface Transporter {
    sendMail(options: SendMailOptions): Promise<unknown>;
  }

  function createTransport(options: CreateTransportOptions): Transporter;

  const nodemailer: {
    createTransport: typeof createTransport;
  };

  export default nodemailer;
}
