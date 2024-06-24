const mailSubjectConstants = {
    RESET_PASS_SUBJECT: 'Password Reset Successfully',
    FORGOT_PASS_SUBJECT: 'Forgot Password',
    FORGOTTED_PASS_SUBJECT: 'Password Changed Successfully',
    SESSION_BOOKED_SUCCESSFULLY: 'Session Booked Successfully',
    VERIFY_EMAIL_SUBJECT: 'Complete Your Registration: Verify Your Email',
    
}

const mailTemplateConstants = {
    VERIFY_EMAIL_TEMPLATE: 'verify_email_template.ejs',
    RESET_PASS_TEMPLATE: 'reset_password_template.ejs',
    FORGOT_PASS_TEMPLATE: 'forgot_password_template.ejs',
    FORGOTTED_PASS_TEMPLATE: 'forgotted_password_template.ejs',
    BOOK_SESSION: 'book_session.ejs',
    INVITATION_TEMPLATE: 'send_invitation_template.ejs',
    WELCOME_TEMPLATE: 'welcome_template.ejs',
    SEND_OFFER_TEMPLATE: 'send_offer_template.ejs',
    SEND_GIG_PURCHASE_REQUEST: 'gig_purchase_template.ejs',
    END_CONTRACT_TEMPLATE: 'end_contract_template.ejs',
    PAYMENT_REQUEST: 'payment_request.ejs',
    TASK_UPDATE: 'task_update.ejs',
    INVITATION_UPDATE_TEMPLATE: 'update_interview_template.ejs',
    OFFER_UPDATE_TEMPLATE: 'update_offer_template.ejs',
    GIG_APPROVE_REJECT: 'gig_approve_reject.ejs',
    GIG_PURCHASE_UPDATE: 'update_gig_purchase_template.ejs',
    SUBMIT_OFFER_TASK: 'submit_task_template.ejs'
}

module.exports = { mailSubjectConstants, mailTemplateConstants };