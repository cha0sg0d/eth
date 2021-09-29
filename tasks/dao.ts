import { task } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import type {
  DarkForestCore,
  DarkForestTokens,
  Whitelist,
  DaoContractPlayer
} from '@darkforest_eth/contracts/typechain';
import CORE_ABI from '@darkforest_eth/contracts/abis/DarkForestCore.json';
import WHITELIST_ABI from '@darkforest_eth/contracts/abis/Whitelist.json';

task('dao', 'deploy and white whitelist dao player')
  .setAction(dao);

async function dao(
  args: {},
  hre: HardhatRuntimeEnvironment
) {

  // Were only using one account, getSigners()[0], the deployer. Becomes the ProxyAdmin
  const [deployer] = await hre.ethers.getSigners();
  // connect to deployed contracts.

  // deploy Dao
  let DaoContractPlayerFactory = await hre.ethers.getContractFactory("DaoContractPlayer");

  const daoPlayer = await DaoContractPlayerFactory.deploy(
    hre.contracts.CORE_CONTRACT_ADDRESS,
    hre.contracts.TOKENS_CONTRACT_ADDRESS
    ) as DaoContractPlayer;

  const address = daoPlayer.address;
    
  await daoPlayer.deployed();

  console.log(`deployed daoPlayer to ${daoPlayer.address}`);
  
  console.log('whitelist address in dao.ts', hre.contracts.WHITELIST_CONTRACT_ADDRESS);

  const whiteList = new hre.ethers.Contract(hre.contracts.WHITELIST_CONTRACT_ADDRESS, WHITELIST_ABI, deployer) as Whitelist;
  const core = new hre.ethers.Contract(hre.contracts.CORE_CONTRACT_ADDRESS, CORE_ABI, deployer) as DarkForestCore;

  console.log('deployer address', deployer.address);

  await hre.run('whitelist:registerAddress', { address });
  
  const dao = await core.players(daoPlayer.address);
  console.log('dao is whitelisted?', await whiteList.isWhitelisted(daoPlayer.address));

  //
    // await daoPlayerInit();
};


  