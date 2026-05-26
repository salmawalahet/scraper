import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { env } from '../config/environment';

const logDir = path.resolve(env.LOG_DIR);

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  }),
);

// Daily rotating file transport for combined logs
const combinedRotate = new DailyRotateFile({
  filename: path.join(logDir, 'combined-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
  format: logFormat,
});

// Daily rotating file transport for error logs
const errorRotate = new DailyRotateFile({
  filename: path.join(logDir, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '30d',
  level: 'error',
  format: logFormat,
});

// Queue-specific log transport
const queueRotate = new DailyRotateFile({
  filename: path.join(logDir, 'queue-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
  format: logFormat,
});

// Worker-specific log transport
const workerRotate = new DailyRotateFile({
  filename: path.join(logDir, 'worker-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
  format: logFormat,
});

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  defaultMeta: { service: env.APP_NAME },
  transports: [
    combinedRotate,
    errorRotate,
    new winston.transports.Console({
      format: consoleFormat,
    }),
  ],
});

// Specialized loggers for different subsystems
export const queueLogger = winston.createLogger({
  level: env.LOG_LEVEL,
  defaultMeta: { service: `${env.APP_NAME}-queue` },
  transports: [
    queueRotate,
    new winston.transports.Console({ format: consoleFormat }),
  ],
});

export const workerLogger = winston.createLogger({
  level: env.LOG_LEVEL,
  defaultMeta: { service: `${env.APP_NAME}-worker` },
  transports: [
    workerRotate,
    new winston.transports.Console({ format: consoleFormat }),
  ],
});

// Stream for Morgan HTTP logging
export const httpLogStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};
