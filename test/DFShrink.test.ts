import { expect } from 'chai';
import { BigNumber } from 'ethers';
import { ethers } from 'hardhat';
import {
  conquerUnownedPlanet,
  fixtureLoader,
  increaseBlockchainTime,
  makeInitArgs,
  makeMoveArgs,
} from './utils/TestUtils';
import { defaultWorldFixture, growingWorldFixture, shrinkingWorldFixture, World } from './utils/TestWorld';
import {
  LVL0_PLANET_OUT_OF_BOUNDS,
  LVL0_PLANET_POPCAP_BOOSTED,
  LVL1_PLANET_SPACE_FURTHER,
  LVL1_ASTEROID_1,
  LVL1_ASTEROID_2,
  LVL1_PLANET_NEBULA,
  LVL1_QUASAR,
  LVL2_PLANET_SPACE,
  LVL4_UNOWNED_DEEP_SPACE,
  SMALL_INTERVAL,
  SPAWN_PLANET_1,
  SPAWN_PLANET_2,
} from './utils/WorldConstants';

const { BigNumber: BN } = ethers;

describe('DarkForestMove', function () {
  let world: World;

  describe('in a shrinking universe', async function () {
    let initialRadius: BigNumber;

    beforeEach(async function () {
      world = await fixtureLoader(shrinkingWorldFixture);
        
      await world.user1Core.initializePlayer(...makeInitArgs(SPAWN_PLANET_1));
    });

    it('should decrease in radius size over time', async function () {
      const initRadius = await world.contracts.core.worldRadius();
      await increaseBlockchainTime(5);

      // Recall that universe will only shrink when a player makes a move.
      await world.user1Core.move(
        ...makeMoveArgs(SPAWN_PLANET_1, SPAWN_PLANET_2, 0, 40000, 0)
      ); 

      const currRadius = await world.contracts.core.worldRadius();
      expect(currRadius.toNumber()).lessThan(initRadius.toNumber());
    });

  });
  
  describe('in a shrinking universe : sequential', async function () {
    let initialRadius: BigNumber;

    before(async function () {
      world = await fixtureLoader(shrinkingWorldFixture);
        
      await world.user1Core.initializePlayer(...makeInitArgs(SPAWN_PLANET_1));
    });

    it('should conquer a planet', async function () {
      await conquerUnownedPlanet(world, world.user1Core, SPAWN_PLANET_1, LVL1_PLANET_SPACE_FURTHER);
      const star1Data = await world.contracts.core.planets(LVL1_PLANET_SPACE_FURTHER.id);
      expect(
        star1Data.owner
      ).to.equal(world.user1.address);
    });

    it('should reject a move to a planet previously in radius', async function () {
      const dist = 100;
      const shipsSent = 50000;
      const silverSent = 0;
  
      await expect(
        world.user1Core.move(
          ...makeMoveArgs(SPAWN_PLANET_1, LVL1_PLANET_SPACE_FURTHER, dist, shipsSent, silverSent)
        )
      ).to.be.revertedWith('Attempting to move out of bounds');
    });

    it('should reject a move from a planet previously in radius', async function () {
      await increaseBlockchainTime();
      await conquerUnownedPlanet(world, world.user1Core, SPAWN_PLANET_1, LVL0_PLANET_POPCAP_BOOSTED);
      const star1Data = await world.contracts.core.planets(LVL0_PLANET_POPCAP_BOOSTED.id);
      expect(
        star1Data.owner
      ).to.equal(world.user1.address);

    });

  });
});



