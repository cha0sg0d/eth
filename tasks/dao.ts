import { task } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import type {
  DarkForestCore,
  DarkForestTokens,
  Whitelist,
  AstralColossus
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
  let AstralColossusFactory = await hre.ethers.getContractFactory("AstralColossus");

  const daoPlayer = await AstralColossusFactory.deploy(
    hre.contracts.CORE_CONTRACT_ADDRESS,
    hre.contracts.TOKENS_CONTRACT_ADDRESS
    ) as AstralColossus;

  const address = daoPlayer.address;
    
  await daoPlayer.deployed();

  console.log(`deployed daoPlayer to ${daoPlayer.address}`);

  // update daoPlayer owner to be player in game
  console.log('dao owner is', await daoPlayer.owner());
  const PLAYER_ADDRESS = '0x1c0f0af3262a7213e59be7f1440282279d788335';
  await daoPlayer.setOwner(PLAYER_ADDRESS);
  console.log('new dao owner is', await daoPlayer.owner());
  
  console.log('whitelist address in dao.ts', hre.contracts.WHITELIST_CONTRACT_ADDRESS);

  const whiteList = new hre.ethers.Contract(hre.contracts.WHITELIST_CONTRACT_ADDRESS, WHITELIST_ABI, deployer) as Whitelist;
  const core = new hre.ethers.Contract(hre.contracts.CORE_CONTRACT_ADDRESS, CORE_ABI, deployer) as DarkForestCore;

  console.log('deployer address', deployer.address);
  
  console.log('player contributions', await daoPlayer.contributions(PLAYER_ADDRESS));
  const from = deployer.address;
  const to = daoPlayer.address;
  await hre.run('wallet:send', { from, to, value: 20, dry: false});

  const balance = await hre.ethers.provider.getBalance(daoPlayer.address);
  console.log('dao balance:', hre.ethers.utils.formatEther(balance));
  // don't need to whitelist; just need to deploy dao.
  
  // this is the public key of the first generic player
  const playerAddress = '0x1c0f0af3262a7213e59be7f1440282279d788335'
  await hre.run('whitelist:registerAddress', { playerAddress });

  await hre.run('whitelist:registerAddress', { address });
  
  const dao = await core.players(daoPlayer.address);
  console.log('dao pre init', dao);
  console.log('dao is whitelisted?', await whiteList.isWhitelisted(daoPlayer.address));
  
  // await daoPlayerInit();
};


  