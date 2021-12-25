import { expect } from 'chai';
import { BigNumber } from 'ethers';
import { ethers } from 'hardhat';
import {
  conquerUnownedPlanet,
  fixtureLoader,
  increaseBlockchainTime,
  makeInitArgs,
  makeMoveArgs,
  getCurrentTime
} from './utils/TestUtils';
import { defaultWorldFixture, growingWorldFixture, shrinkingWorldFixture, World } from './utils/TestWorld';
import {
  LVL0_PLANET_OUT_OF_BOUNDS,
  LVL0_PLANET_POPCAP_BOOSTED,
  LVL1_PLANET_SPACE_FURTHER,
  SPAWN_PLANET_3,
  LVL1_ASTEROID_1,
  LVL1_ASTEROID_2,
  LVL1_PLANET_NEBULA,
  LVL1_QUASAR,
  LVL2_PLANET_SPACE,
  LVL4_UNOWNED_DEEP_SPACE,
  SMALL_INTERVAL,
  SPAWN_PLANET_1,
  SPAWN_PLANET_2,
  shrinkingInitializers,
  INVALID_TOO_CLOSE_SPAWN,
} from './utils/WorldConstants';

const { BigNumber: BN } = ethers;

describe('DarkForestShrink', function () {
  let world: World;

  describe('in a shrinking universe', async function () {
    let initialRadius: BigNumber;

    beforeEach(async function () {
      world = await fixtureLoader(shrinkingWorldFixture);

      const time = await getCurrentTime();

      await world.contracts.core.setStartTime(time);
      await world.contracts.core.setEndTime(time + 5000);
      await world.contracts.core.adminSetWorldRadius(shrinkingInitializers.INITIAL_WORLD_RADIUS);

      await world.user1Core.initializePlayer(...makeInitArgs(SPAWN_PLANET_1, SPAWN_PLANET_1.distFromOrigin));
    });

    it('should decrease radius size after move', async function () {
      const initRadius = await world.contracts.core.worldRadius();
      await increaseBlockchainTime(5);

      // Recall that universe will only shrink when a player makes a move.
      await world.user1Core.move(
        ...makeMoveArgs(SPAWN_PLANET_1, SPAWN_PLANET_2, 0, 40000, 0)
      ); 

      const currRadius = await world.contracts.core.worldRadius();
      expect(currRadius.toNumber()).lessThan(initRadius.toNumber());
    });

    it('rejects a player spawning outside of middle ring', async function () {
      const initRadius = await world.contracts.core.worldRadius();
      await expect(
        world.user2Core.initializePlayer(...makeInitArgs(SPAWN_PLANET_2, initRadius.toNumber()))
      ).to.be.revertedWith("Init radius is too high");
    });
  
    it('rejects a player spawning inside of middle ring', async function () {
      await expect(
        world.user2Core.initializePlayer(...makeInitArgs(SPAWN_PLANET_2, 0))
      ).to.be.revertedWith("Init radius is too low");
    });

    it('accepts a player spawning in middle ring and shrinks radius', async function () {
      const initRadius = await world.contracts.core.worldRadius();
      await expect(world.user2Core.initializePlayer(...makeInitArgs(SPAWN_PLANET_2, SPAWN_PLANET_2.distFromOrigin)))
        .to.emit(world.contracts.core, 'PlayerInitialized')
        .withArgs(world.user2.address, SPAWN_PLANET_2.id.toString());

      const currRadius = await world.contracts.core.worldRadius();
      expect(currRadius.toNumber()).lessThan(initRadius.toNumber());
    });

    it('radius cant go below minRadius', async function () {
      const minRadius = (await world.contracts.core.gameConstants()).MIN_RADIUS;
      const initRadius = (await world.contracts.core.worldRadius()).toNumber();

      await increaseBlockchainTime();

      const currRadius = (await world.contracts.core.worldRadius()).toNumber();

      expect(currRadius).to.equal(initRadius);

      // player initializes before radius is shrunk. 
      // hopefully this is taken care of by spawning in middle ring.
      await expect(world.user2Core.initializePlayer(...makeInitArgs(SPAWN_PLANET_2, Math.floor(currRadius / 2))))
        .to.emit(world.contracts.core, 'PlayerInitialized')
        .withArgs(world.user2.address, SPAWN_PLANET_2.id.toString());

      const finalRadius = await world.contracts.core.worldRadius();
      console.log("finalRadius ", finalRadius.toNumber());
      expect(finalRadius.toNumber()).to.equal(minRadius.toNumber());
    });
  

  });
});



