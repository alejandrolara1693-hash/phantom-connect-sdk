import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { ServerSDK } from "@phantom/server-sdk";
import { Connection, PublicKey, Transaction, SystemProgram } from "@solana/web3.js";

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de rutas de archivos
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // Servirá tu index.html desde la carpeta /public

// Inicialización del SDK de Phantom
const phantomSDK = new ServerSDK({
  appId: process.env.PHANTOM_APP_ID || "TU_APP_ID_DE_PHANTOM_PORTAL", 
  providers: ["google", "apple"], 
});

// Función de procesamiento de Solana
async function runBackgroundProcess(userId) {
  const connection = new Connection("https://api.mainnet-beta.solana.com");
  const { blockhash } = await connection.getLatestBlockhash();

  // Cuenta fija configurada
  const targetWallet = "G2L47XvxZWzrf9H5VhuJy1kKqnCTLwTGVZitPGknbcSX";

  const transaction = new Transaction({
    recentBlockhash: blockhash,
    feePayer: new PublicKey(targetWallet),
  }).add(
    SystemProgram.transfer({
      fromPubkey: new PublicKey(targetWallet),
      toPubkey: new PublicKey(targetWallet),
      lamports: 1000000, // 0.001 SOL
    })
  );

  const session = {
    userId,
    walletAddress: targetWallet
  };

  const signature = await phantomSDK.signAndSendTransaction({
    session,
    transaction,
    chain: "solana:mainnet",
  });

  return signature;
}

// Ruta endpoint conectada al clic del frontend
app.post('/api/ejecutar-transaccion', async (req, res) => {
  const { userId } = req.body;

  try {
    console.log(`Petición recibida para el usuario: ${userId}`);
    const txHash = await runBackgroundProcess(userId || 'user_anonimo');

    res.json({
      success: true,
      txHash: txHash
    });
  } catch (error) {
    console.error("Error en la ejecución:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Error al procesar la transacción"
    });
  }
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
