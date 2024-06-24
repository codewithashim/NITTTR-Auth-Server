const { validateRequest } = require('../validate-request');
const Joi = require('joi');

const signUpValidation = (req, res, next) => {
    const schema = Joi.object({
        name: Joi.string().required(),
        email: Joi.string().required(),
        password: Joi.string().required(),
        number: Joi.string().required(),
        
    })
    validateRequest(req, res, schema, next);
}
const emailVerifyValidation = (req, res, next) => {
    const schema = Joi.object({
        user_id: Joi.string().required(),
        token: Joi.string().required()
    })
    validateRequest(req, res, schema, next);
}

const signInValidation = (req, res, next) => {
    const schema = Joi.object({
        email: Joi.string().required(),
        password: Joi.string().required()
    })
    validateRequest(req, res, schema, next);
}

const forgotPasswordValidation = (req, res, next) => {
    const schema = Joi.object({
        email: Joi.string().required(),
        ref: Joi.string().required()
    })
    validateRequest(req, res, schema, next)
}

const changePasswordValidation = (req, res, next) => {
    const schema = Joi.object({
        new_password: Joi.string().required()
    })
    validateRequest(req, res, schema, next)
}

const resetPasswordValidation = (req, res, next) => {
    const schema = Joi.object({
        old_password: Joi.string().required(),
        new_password: Joi.string().required()
    })
    validateRequest(req, res, schema, next)
}

const experienceValidation = (req, res, next) => {
    const schema = Joi.object({
        experienceId: Joi.string().required()
    })
    validateRequest(req, res, schema, next)
}

const educationValidation = (req, res, next) => {
    const schema = Joi.object({
        educationId: Joi.string().required()
    })
    validateRequest(req, res, schema, next)
}

module.exports = {
    signUpValidation,
    signInValidation,
    forgotPasswordValidation,
    changePasswordValidation,
    resetPasswordValidation,
    emailVerifyValidation,
    experienceValidation,
    educationValidation
}