// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title RaceRegistry
/// @notice Minimal on-chain registry for horse races, player identities, and results.
/// Stores player name/color preferences and finalized race results for historical stats.
contract RaceRegistry {
    // ---------------------------
    // Player identity
    // ---------------------------
    mapping(address => string) public nameByAddress;
    mapping(address => uint24) public colorByAddress; // RGB hex (0xRRGGBB)

    event NameUpdated(address indexed player, string name);
    event ColorUpdated(address indexed player, uint24 rgb);

    function setName(string calldata name) external {
        nameByAddress[msg.sender] = name;
        emit NameUpdated(msg.sender, name);
    }

    /// @param rgb Encoded as 0xRRGGBB (e.g. 0xff0000 for red)
    function setColor(uint24 rgb) external {
        colorByAddress[msg.sender] = rgb;
        emit ColorUpdated(msg.sender, rgb);
    }

    // ---------------------------
    // Race storage
    // ---------------------------
    struct Race {
        uint64 id;
        uint64 startedAt; // unix seconds
        uint64 endedAt; // unix seconds
        address[] players; // participants in the race
        address winner; // address of the winner
        uint256[] finishTotals; // on-chain ClickCounter totals at finish per player index
    }

    uint64 public nextRaceId = 1;
    mapping(uint64 => Race) public raceById;

    event RaceStarted(uint64 indexed id, address[] players, uint64 startedAt);
    event RaceFinalized(
        uint64 indexed id,
        address indexed winner,
        address[] players,
        uint256[] finishTotals,
        uint64 endedAt
    );

    /// @notice Create a race header with its participant set. Anyone can start; off-chain coordination decides when.
    function startRace(
        address[] calldata players
    ) external returns (uint64 id) {
        require(players.length >= 2, "min players");
        id = nextRaceId++;
        Race storage r = raceById[id];
        r.id = id;
        r.startedAt = uint64(block.timestamp);
        for (uint256 i = 0; i < players.length; i++) {
            require(players[i] != address(0), "zero player");
            r.players.push(players[i]);
        }
        emit RaceStarted(id, r.players, r.startedAt);
    }

    /// @notice Finalize a race by storing the final ClickCounter totals for each player.
    /// @dev The `players` array must match the original order from startRace.
    function finalizeRace(
        uint64 id,
        address[] calldata players,
        uint256[] calldata finishTotals
    ) external {
        Race storage r = raceById[id];
        require(r.id == id && r.startedAt != 0, "race not found");
        require(r.endedAt == 0, "already ended");
        require(players.length == r.players.length, "players mismatch");
        require(players.length == finishTotals.length, "totals mismatch");
        // Verify order and set totals
        for (uint256 i = 0; i < players.length; i++) {
            require(players[i] == r.players[i], "order mismatch");
            r.finishTotals.push(finishTotals[i]);
        }
        // Determine winner by highest finish total
        uint256 maxIdx = 0;
        for (uint256 j = 1; j < r.finishTotals.length; j++) {
            if (r.finishTotals[j] > r.finishTotals[maxIdx]) {
                maxIdx = j;
            }
        }
        r.winner = r.players[maxIdx];
        r.endedAt = uint64(block.timestamp);
        emit RaceFinalized(id, r.winner, r.players, r.finishTotals, r.endedAt);
    }
}
