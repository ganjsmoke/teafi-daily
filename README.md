# Auto Swap and Check-in Script for Tea-Fi

This script automates the process of check-ins and swaps for the Tea-Fi platform, using MATIC and WPOL (Wrapped MATIC). The script supports Ethereum-compatible networks such as Polygon (MATIC).

## Requirements:
1. **At least 5 MATIC** for gas fees (Approx. $0.08/day).
2. A **private key** for the wallet (stored in `private_keys.txt`).
3. A registered account on Tea-Fi (Optional but recommended to use the author's referral code for support).

## Steps to Setup:

### 1. Clone the Repository:
Clone this repository to your local machine by running the following command in your terminal:

```
git clone https://github.com/ganjsmoke/teafi-daily.git
cd teafi-daily
```

### 2. Install Dependencies:
Then, install the required dependencies using npm (Node Package Manager):

```
npm i
```


### 3. Set Up Your Private Keys:
- Create a file called `private_keys.txt` in the root directory.
- Add your Ethereum private key(s) to the `private_keys.txt` file (one per line). **Ensure there are no extra spaces or newlines** around the keys.

### 4. Prepare Your Wallet:
- Ensure your wallet has at least **5 MATIC** (Approx. $0.08/day) for gas fees. (Top up when low balance to make sure its running daily)

### 5. Author Referral:
Support the author by registering through the referral link:
[https://app.tea-fi.com/?ref=7o88cv](https://app.tea-fi.com/?ref=7o88cv)

By using this link to register, you help support the development of this script.

### 6. Run the Script:
Once everything is set up, run the script by executing the following command:

```
node index.js
```


This will initiate the process of checking in and swapping your tokens. The script will automatically run again in 24 hours.

## Configuration:
- **RPC_URL**: You can use any compatible RPC URL for Polygon or Ethereum.
- **PRIVATE_KEYS**: Add your private keys to `private_keys.txt` for the script to access and interact with your wallet.

### 7. Troubleshooting:
- If you encounter errors, ensure that your private key is correct and properly formatted.
- Check that your wallet has sufficient MATIC for gas fees before running the script.
- If you have any issues, feel free to open an issue in the repository, and we’ll try to assist.

## Support:
- For any issues or bugs, feel free to reach out or open an issue in the GitHub repository.
- If you find the script helpful, consider contributing or supporting the project by using the author's referral link: [app.tea-fi.com/?ref=7o88cv](https://app.tea-fi.com/?ref=7o88cv).

Thank you for using the Tea-Fi Auto Swap & Check-in script!
