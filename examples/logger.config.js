// Example logger configuration for ElizaOS projects
// This file can be named:
// - logger.config.js
// - logger.config.ts
// - logger.config.mjs
// - config/logger.js
// - config/logger.ts
// - config/logger.mjs
//
// Or you can include the configuration in your project's main module
// export or in package.json under elizaos.logger

export default {
  // Logger name/label
  name: 'my-agent',
  
  // Default log level (trace, debug, info, warn, error, fatal)
  level: 'info',
  
  // Whether to enable Sentry logging
  sentry: true,
  
  // Custom log levels
  levels: {
    levels: {
      fatal: 60,
      error: 50,
      warn: 40,
      info: 30,
      log: 29,
      progress: 28,
      success: 27,
      debug: 20,
      trace: 10,
    },
    colors: {
      60: 'red',      // fatal
      50: 'red',      // error
      40: 'yellow',   // warn
      30: 'blue',     // info
      29: 'green',    // log
      28: 'cyan',     // progress
      27: 'greenBright', // success
      20: 'magenta',  // debug
      10: 'grey',     // trace
    }
  },
  
  // Formatter configuration
  formatter: {
    // Use JSON format output
    json: false,
    
    // Show timestamps in logs
    timestamps: true,
    
    // Timestamp format
    timestampFormat: 'yyyy-mm-dd HH:MM:ss',
    
    // Fields to ignore in output
    ignore: ['pid', 'hostname'],
    
    // Whether to colorize output
    colorize: true,
    
    // Custom prettifiers for formatting
    prettifiers: {
      level: (level) => {
        const levelNames = {
          10: 'TRACE',
          20: 'DEBUG',
          27: 'SUCCESS',
          28: 'PROGRESS',
          29: 'LOG',
          30: 'INFO',
          40: 'WARN',
          50: 'ERROR',
          60: 'FATAL',
        };
        return levelNames[level] || `LEVEL${level}`;
      },
      msg: (msg) => {
        // Replace "ERROR (TypeError):" pattern with just "ERROR:"
        return msg.replace(/ERROR \([^)]+\):/g, 'ERROR:');
      },
    },
  },
  
  // Array of transport configurations
  transports: [
    {
      name: 'console',
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'yyyy-mm-dd HH:MM:ss',
        ignore: 'pid,hostname',
        messageFormat: '{msg}',
      },
    },
    
    // Example: CloudWatch transport (requires pino-cloudwatch)
    // {
    //   name: 'cloudwatch',
    //   target: 'pino-cloudwatch',
    //   level: 'info',
    //   options: {
    //     logGroup: '/aws/eliza/my-agent',
    //     logStream: 'my-agent-stream',
    //     awsRegion: 'us-east-1',
    //     awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
    //     awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    //   },
    // },
    
    // Example: File transport (requires pino-file)
    // {
    //   name: 'file',
    //   target: 'pino-file',
    //   level: 'info',
    //   options: {
    //     destination: './logs/app.log',
    //     mkdir: true,
    //   },
    // },
    
    // Example: HTTP transport (requires pino-http-send)
    // {
    //   name: 'http',
    //   target: 'pino-http-send',
    //   level: 'warn',
    //   options: {
    //     url: 'https://logs.example.com/api/logs',
    //     method: 'POST',
    //     headers: {
    //       'Content-Type': 'application/json',
    //       'Authorization': 'Bearer ' + process.env.LOG_API_TOKEN,
    //     },
    //   },
    // },
  ],
  
  // Logger hooks for custom processing
  hooks: {
    // Hook function to process log arguments before logging
    logMethod: (inputArgs, method) => {
      // Custom processing logic here
      // For example: filter sensitive information, add context, etc.
      return method.apply(this, inputArgs);
    },
  },
  
  // Raw pino options for advanced configuration
  pinoOptions: {
    // Additional pino options not covered above
    // See: https://github.com/pinojs/pino/blob/master/docs/api.md#options
  },
};