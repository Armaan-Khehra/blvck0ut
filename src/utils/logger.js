const timestamp = () => new Date().toISOString().replace('T', ' ').split('.')[0];

module.exports = {
    info: (...args) => console.log(`[${timestamp()}] [INFO]`, ...args),
    warn: (...args) => console.warn(`[${timestamp()}] [WARN]`, ...args),
    error: (...args) => console.error(`[${timestamp()}] [ERROR]`, ...args),
};
