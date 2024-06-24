const winston = require('winston');
const logger = winston.createLogger({
    transports: [
        new winston.transports.File({
            filename: 'logs/server.log',
            format: winston.format.combine(
                winston.format.timestamp({ format: 'MMM-DD-YYYY HH:mm:ss' }),
                winston.format.align(),
                winston.format.printf(
                    (info) => `${info.level}: ${[info.timestamp]}: ${info.message}`
                )
            ),
        })
    ],
});

logger.add(new winston.transports.Console({
    format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'MMM-DD-YYYY HH:mm:ss' }),
        winston.format.align(),
        winston.format.printf(
            (log) => `${log.level}: ${[log.timestamp]}: ${log.message}`
        )
    ),
}));

module.exports = logger;