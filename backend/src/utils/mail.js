import Mailgen from "mailgen";
import nodemailer from "nodemailer";

/* 
    options:{
        email: ,
        subject: ,
        mailGenContent:
    }
*/
const sendEmail = async function (options) {
    if (!options?.email || !options?.subject || !options?.mailGenContent) {
        throw new TypeError("Email requires a recipient, subject, and mail content");
    }

    const appName = process.env.MAIL_PRODUCT_NAME || "Secure DMS";
    const appUrl = process.env.MAIL_PRODUCT_URL || "http://localhost:5173";
    const smtpPort = Number(process.env.SMTP_MAILTRAP_PORT || process.env.SMTP_PORT);

    if (!process.env.SMTP_MAILTRAP_HOST || !smtpPort || !process.env.SMTP_MAILTRAP_USERNAME || !process.env.SMTP_MAILTRAP_PASSWORD) {
        throw new Error("SMTP configuration is incomplete");
    }

    const mailGenerator = new Mailgen({
        theme: "default",
        product: {
            name: appName,
            link: appUrl
        }
    });

    const emailTextual = mailGenerator.generatePlaintext(options.mailGenContent);
    const emailHtml = mailGenerator.generate(options.mailGenContent);

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_MAILTRAP_HOST,
        port: smtpPort,
        secure: process.env.SMTP_SECURE === "true",
        auth: {
            user: process.env.SMTP_MAILTRAP_USERNAME,
            pass: process.env.SMTP_MAILTRAP_PASSWORD
        }
    });

    const mail = {
        from: process.env.SMTP_FROM || process.env.SMTP_MAILTRAP_USERNAME,
        to: options.email,
        subject: options.subject,
        text: emailTextual,
        html: emailHtml
    };

    return transporter.sendMail(mail);
};

const emailVerificationEmailGenContent = function (username, emailVerificationLink){
    return {
        body:{
            name: username,
            intro: "Welcome to our App, we are excited to have you on board",
            action:{
                instructions: "To verify your email, click the button below",
                button:{
                    color: "#22BC64",
                    text: "Verify your email",
                    link: emailVerificationLink,
                }
            },
            outro: "Need help, or feel stuck? Reply with help on the mail and we will be pleased to help"
        },
    }
}

const forgotPasswordEmailGenContent = function (username, forgetPasswordLink){
    return {
        body:{
            name: username,
            intro: "Welcome to our App, we are excited to have you on board",
            action:{
                instructions: "To reset your password, click on the button below",
                button:{
                    color: "#22BC64",
                    text: "Forget Password",
                    link: forgetPasswordLink
                }
            },
            outro: "Need help, or feel stuck? Reply with help on the mail and we will be pleased to help"
        },
    }
}

export { sendEmail, emailVerificationEmailGenContent, forgotPasswordEmailGenContent };