const fs = require('fs');
const Web3 = require('web3');
const axios = require('axios');
const chalk = require('chalk');

// Configuration Constants (use let for variables that need to change)
const RPC_URL = 'YOUR ALCHEMY RPC';
const POL_ADDRESS = '0x0000000000000000000000000000000000000000';
const WPOL_ADDRESS = '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270';
const SWAP_LOOP_COUNT = 50;

const ABI = [
  {
    "constant": false,
    "inputs": [],
    "name": "deposit",
    "outputs": [],
    "payable": true,
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      {
        "internalType": "uint256",
        "name": "wad",
        "type": "uint256"
      }
    ],
    "name": "withdraw",
    "outputs": [],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
  "constant": true,
  "inputs": [
    {
      "internalType": "address",
      "name": "account",
      "type": "address"
    }
  ],
  "name": "balanceOf",
  "outputs": [
    {
      "internalType": "uint256",
      "name": "",
      "type": "uint256"
    }
  ],
  "payable": false,
  "stateMutability": "view",
  "type": "function"
}
];

const web3 = new Web3(new Web3.providers.HttpProvider(RPC_URL));
// Read and trim private keys, ensuring they are properly formatted
const PRIVATE_KEYS = fs.readFileSync('private_keys.txt', 'utf-8')
  .split('\n')
  .map(key => key.trim())  // Trim any leading/trailing spaces or newlines
  .filter(key => key.length === 66);  // Ensure the key is valid (66 characters for a hex key)

console.log(`Loaded ${PRIVATE_KEYS.length} private keys.`);


// Function to print header
function printHeader() {
    const line = "=".repeat(50);
    const title = "Auto Checkin & Swap 100x Daily";
    const createdBy = "Bot created by: https://t.me/airdropwithmeh";

    const totalWidth = 50;
    const titlePadding = Math.floor((totalWidth - title.length) / 2);
    const createdByPadding = Math.floor((totalWidth - createdBy.length) / 2);

    const centeredTitle = title.padStart(titlePadding + title.length).padEnd(totalWidth);
    const centeredCreatedBy = createdBy.padStart(createdByPadding + createdBy.length).padEnd(totalWidth);

    console.log(chalk.cyan.bold(line));
    console.log(chalk.cyan.bold(centeredTitle));
    console.log(chalk.green(centeredCreatedBy));
    console.log(chalk.cyan.bold(line));
}
async function main() {
  // Capture the current time when the script starts
  const startTime = Date.now();
  printHeader();

  // Perform Auto Checkin
  await autoCheckin(); // Directly call autoCheckin, as it already includes retry logic

  // After check-in, perform Auto Swap
  await autoSwap(); // No retry needed here, just call autoSwap

  // Calculate the elapsed time and adjust the delay for 24 hours minus elapsed time
  const elapsedTime = Date.now() - startTime; // Elapsed time in milliseconds
  const remainingTime = 24 * 60 * 60 * 1000 - elapsedTime; // Remaining time to 24 hours

  console.log(chalk.blue(`Time elapsed: ${elapsedTime / 1000} seconds. Scheduling next run in ${remainingTime / 1000} seconds.`));

  // Schedule the next run to occur exactly 24 hours from the initial execution time
  setTimeout(() => {
    console.log(chalk.green('\n--- Starting new cycle ---'));
    main().catch(console.error); // Start the script again after the remaining time
  }, remainingTime);
}


async function retryWithDelay(fn, retries = 10, delay = 60000) {
  let attempt = 0;
  while (attempt < retries) {
    try {
      return await fn(); // Try to execute the function
    } catch (error) {
      attempt++;
      if (attempt >= retries) {
        console.error(chalk.red(`Max retries reached for function ${fn.name}.`));
        throw error; // If max retries are reached, throw the error
      }
      console.log(chalk.yellow(`Attempt ${attempt} failed. Retrying in 1 minute...`));
      await new Promise(resolve => setTimeout(resolve, delay)); // Wait for the specified delay
    }
  }
}

async function getGasFee() {
  try {
    const response = await axios.get('https://api.tea-fi.com/transaction/gas-quote', {
      params: {
        chain: 137, // Polygon
        txType: 2, // Transaction type 2 (for swap)
        gasPaymentToken: '0x0000000000000000000000000000000000000000', // MATIC
        neededGasPermits: 0
      }
    });

    // Extract the gas fee in native token (MATIC)
    const gasFeeInNativeToken = response.data.gasInNativeToken;
    console.log(chalk.green('Gas fee (in MATIC):', gasFeeInNativeToken));

    return gasFeeInNativeToken; // Return the gas fee in MATIC
  } catch (error) {
    console.error(chalk.red('Error fetching gas fee:', error.message));
    throw error; // Rethrow the error to handle it in the calling function
  }
}

async function autoCheckin() {
  console.log(chalk.blue('\n=== Processing checkins ==='));
  for (const pk of PRIVATE_KEYS) {
    const account = web3.eth.accounts.privateKeyToAccount(pk);
    const address = account.address;
    console.log(chalk.yellow(`\nProcessing ${address}...`));

    try {
      // Fetch the check-in data and retry only if there is a network issue or API error
      const { data } = await retryWithDelay(() => axios.get(
        `https://api.tea-fi.com/wallet/check-in/current?address=${address}`
      ));
      
      const now = new Date();
      const currentDayStart = new Date(data.currentDay.start);
      const currentDayEnd = new Date(data.currentDay.end);

      if (now < currentDayStart || now > currentDayEnd) {
        console.log(chalk.red('Not in check-in period'));
        continue;
      }

      // If the user has already checked in today, skip the check-in
      if (data.lastCheckIn) {
        const lastCheckIn = new Date(data.lastCheckIn);
        if (lastCheckIn >= currentDayStart && lastCheckIn <= currentDayEnd) {
          console.log(chalk.yellow('Already checked in today'));
          continue; // Skip check-in for today
        }
      }

      // If not checked in yet, proceed with the check-in
      await retryWithDelay(() => axios.post(`https://api.tea-fi.com/wallet/check-in?address=${address}`));
      console.log(chalk.green(`Check-in successful for ${address}`));
    } catch (error) {
      console.error(chalk.red(`Check-in error for ${account.address}: ${error.message}`));
    }
  }
}



async function autoSwap() {
  console.log(chalk.blue('\n=== Starting auto swap ==='));
  let walletIndex = 1; // Counter for each wallet

  for (const pk of PRIVATE_KEYS) {
    const privateKey = pk.trim();
    const account = web3.eth.accounts.privateKeyToAccount(privateKey);
    web3.eth.accounts.wallet.add(account);
    web3.eth.defaultAccount = account.address;

    console.log(chalk.yellow(`\nStarting loop for wallet ${walletIndex} - Address: ${account.address}`));

    // Execute the wrap and unwrap loop
    for (let i = 0; i < SWAP_LOOP_COUNT; i++) {
      console.log(chalk.green(`\nProgress [Wallet ${walletIndex} - Loop #${i + 1}]...`));

      // Wrap MATIC to WPOL
      await wrapMATIC(account, privateKey);

      // Unwrap WPOL back to MATIC
      await unwrapWPOL(account, privateKey);

      console.log(chalk.green(`Loop #${i + 1} completed for wallet: ${account.address}`));
    }

    walletIndex++; // Increment the wallet counter
    console.log(chalk.green(`Swap cycle completed for wallet: ${account.address}`));
  }
}

// Wrap MATIC to WPOL
async function wrapMATIC(account, privateKey) {
  console.log(chalk.blue(`\nWrapping MATIC to WPOL for wallet: ${account.address}`));

  const wmaticContract = new web3.eth.Contract(ABI, WPOL_ADDRESS);
  const maticAmount = '1'; // Amount of MATIC to wrap
  const amountWei = web3.utils.toWei(maticAmount, 'ether');

  const priorityFeeGwei = 30;

  const baseFee = await web3.eth.getGasPrice();
  const currentBaseGwei = Number(web3.utils.fromWei(baseFee, 'gwei'));

  const maxPriorityFeePerGas = web3.utils.toWei(priorityFeeGwei.toString(), 'gwei');
  const maxFeePerGas = web3.utils.toWei(Math.ceil(currentBaseGwei * 1.25 + priorityFeeGwei).toString(), 'gwei');

  const gasEstimate = await wmaticContract.methods.deposit().estimateGas({
    from: account.address,
    value: amountWei
  });

  const gasWithBuffer = Math.floor(gasEstimate * 1.2);

  const tx = {
    from: account.address,
    to: WPOL_ADDRESS,
    value: amountWei,
    gas: gasWithBuffer,
    maxPriorityFeePerGas,
    maxFeePerGas,
    data: wmaticContract.methods.deposit().encodeABI()
  };

  const signedTx = await web3.eth.accounts.signTransaction(tx, privateKey);
  const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

  console.log(chalk.green(`Wrap transaction successful: ${receipt.transactionHash}`));

  // Notify API with wrap transaction details
  await notifyTransaction(receipt.transactionHash, account.address, maticAmount, 'POL', 'WPOL');
}

// Unwrap WPOL back to MATIC
async function unwrapWPOL(account, privateKey) {
  console.log(chalk.blue(`\nUnwrapping WPOL back to MATIC for wallet: ${account.address}`));

  const wmaticContract = new web3.eth.Contract(ABI, WPOL_ADDRESS);
  const amountWei = web3.utils.toWei('1', 'ether');

  // Check balance first
  const balance = await wmaticContract.methods.balanceOf(account.address).call();
  if (balance < amountWei) {
    console.log(chalk.red('Insufficient WPOL balance for unwrapping'));
    return;
  }

  // Add gas fee calculation
  const priorityFeeGwei = 30;
  const baseFee = await web3.eth.getGasPrice();
  const currentBaseGwei = Number(web3.utils.fromWei(baseFee, 'gwei'));

  const maxPriorityFeePerGas = web3.utils.toWei(priorityFeeGwei.toString(), 'gwei');
  const maxFeePerGas = web3.utils.toWei(Math.ceil(currentBaseGwei * 1.25 + priorityFeeGwei).toString(), 'gwei');

  // Estimate gas with proper parameters
  const gasEstimate = await wmaticContract.methods.withdraw(amountWei).estimateGas({
    from: account.address
  });

  const gasWithBuffer = Math.floor(gasEstimate * 1.2);

  const tx = {
    from: account.address,
    to: WPOL_ADDRESS,
    data: wmaticContract.methods.withdraw(amountWei).encodeABI(),
    gas: gasWithBuffer,
    maxPriorityFeePerGas,
    maxFeePerGas,
    chainId: 137 // Polygon chain ID
  };

  const signedTx = await web3.eth.accounts.signTransaction(tx, privateKey);
  const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

  console.log(chalk.green(`Unwrap transaction successful: ${receipt.transactionHash}`));
  await notifyTransaction(receipt.transactionHash, account.address, '1', 'WPOL', 'POL');
}

// Notify transaction to the API
async function notifyTransaction(hash, walletAddress, amount, fromToken, toToken) {
  // Get gas fee quote from the API
  let gasFeeAmount = await getGasFee();

  // Set the token addresses dynamically
  let fromTokenAddress, toTokenAddress;
  if (fromToken === 'POL') {
    fromTokenAddress = POL_ADDRESS; // MATIC address
  } else if (fromToken === 'WPOL') {
    fromTokenAddress = WPOL_ADDRESS; // WPOL address
  }

  if (toToken === 'POL') {
    toTokenAddress = POL_ADDRESS; // MATIC address
  } else if (toToken === 'WPOL') {
    toTokenAddress = WPOL_ADDRESS; // WPOL address
  }

  const payload = {
    blockchainId: 137,  // Polygon
    type: 2,
    walletAddress: walletAddress,
    hash: hash,
    fromTokenAddress: fromTokenAddress,
    toTokenAddress: toTokenAddress,
    fromTokenSymbol: fromToken,
    toTokenSymbol: toToken,
    fromAmount: web3.utils.toWei(amount, 'ether').toString(),
    toAmount: web3.utils.toWei(amount, 'ether').toString(),
    gasFeeTokenAddress: POL_ADDRESS, // MATIC as gas fee token
    gasFeeTokenSymbol: 'POL',
    gasFeeAmount: gasFeeAmount.toString() // Use gasInNativeToken from API
  };

  try {
    await retryWithDelay(async () => {
      try {
        const response = await axios.post('https://api.tea-fi.com/transaction', payload);
        console.log(chalk.green(`Transaction notification sent successfully. Points Amount: ${response.data.pointsAmount}`));
      } catch (error) {
        console.error(chalk.red('Error notifying transaction:'));
        if (error.response) {
          // The request was made and the server responded with a status code
          console.error(chalk.red('Status:', error.response.status));
          console.error(chalk.red('Data:', JSON.stringify(error.response.data, null, 2)));
        } else if (error.request) {
          // The request was made but no response was received
          console.error(chalk.red('No response received from the API.'));
        } else {
          // Something happened in setting up the request
          console.error(chalk.red('Error:', error.message));
        }
        throw error; // Re-throw the error to trigger retry
      }
    });
  } catch (error) {
    console.error(chalk.red('Max retries reached. Failed to notify transaction.'));
  }
}



main().catch(console.error);
