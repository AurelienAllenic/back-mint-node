const mongoose = require('mongoose');

let connectionPromise = null;

const connectDB = async () => {
    if (mongoose.connection.readyState === 1) {
        return mongoose.connection;
    }

    if (!connectionPromise) {
        connectionPromise = mongoose.connect(process.env.MONGO_SECRET_KEY, {
            maxPoolSize: 10,
        }).then((conn) => {
            console.log('Connexion à MongoDB réussie !');
            return conn;
        }).catch((error) => {
            connectionPromise = null;
            console.error('Erreur de connexion à MongoDB :', error);
            throw error;
        });
    }

    return connectionPromise;
};

module.exports = connectDB;
