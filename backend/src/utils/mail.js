import Mailgen from "mailgen";
import nodemailer from "nodemailer";


/* 
    options:{
        email: ,
        subject: ,
        mailGenContent:
    }
*/
const sendEmail =async function(options){

    const mailGenerator=new Mailgen({
        theme: "default",
        product:{
            name: "SIH",
            link: "https://SIH.example.com"
        }
    });

    const emailTextual = mailGenerator.generatePlaintext(options.mailGenContent);
    const emailHtml= mailGenerator.generate(options.mailGenContent);

    const transporter=nodemailer.createTransport({
        host: process.env.SMTP_MAILTRAP_HOST,
        port: process.env.SMTP_MAILTRAP_PORT,
        auth:{
            user: process.env.SMTP_MAILTRAP_USERNAME,
            pass: process.env.SMTP_MAILTRAP_PASSWORD
        }
    });

    const mail={
        from: "projectManagement@example.com",
        to: options.email,
        subject: options.subject,
        text: emailTextual,
        html: emailHtml
    }

    try{
        await transporter.sendMail(mail);
    } catch(error){
        console.error("Try checking the env variables");
        console.error("Error: ", error);
    }
}

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