#!/bin/sh

# Generate env.js with environment variables
echo "window.ENV = {" > /app/public/env.js
echo "  VITE_RPC_URL: '${VITE_RPC_URL}'," >> /app/public/env.js
echo "  VITE_PRIVATE_KEY: '${VITE_PRIVATE_KEY}'," >> /app/public/env.js
echo "  VITE_CONTRACT_ADDRESS: '${VITE_CONTRACT_ADDRESS}'," >> /app/public/env.js
echo "  VITE_ORACLE_URL: '${VITE_ORACLE_URL}'," >> /app/public/env.js
echo "  VITE_CONSORTIUM_WALLETS: '${VITE_CONSORTIUM_WALLETS}'," >> /app/public/env.js
echo "  VITE_COMPANY_NAME: '${VITE_COMPANY_NAME}'," >> /app/public/env.js
echo "  VITE_ACCOUNT_ID: '${VITE_ACCOUNT_ID}'" >> /app/public/env.js
echo "};" >> /app/public/env.js

exec "$@"
