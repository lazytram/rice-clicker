// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ClickCounter
/// @notice Minimal on-chain global click counter.
/// Anyone can call `click()` to increment the global counter by 1.
/// Optionally, `clickMany(times)` allows batching multiple increments in one tx.
contract ClickCounter {
    /// @notice Total number of clicks recorded globally.
    uint256 public totalClicks;

    /// @notice Per-address clicks recorded (informational only).
    mapping(address => uint256) public clicksByAddress;

    // ---------------------------
    // Session keys (delegate authorization)
    // ---------------------------
    struct Session {
        address owner;
        uint64 expiresAt;
    }

    /// @notice Mapping from delegate address to session details.
    mapping(address => Session) public sessionByDelegate;

    /// @notice Emitted when an owner authorizes a delegate until a given expiry.
    event SessionAuthorized(
        address indexed owner,
        address indexed delegate,
        uint64 expiresAt
    );

    /// @notice Emitted when an owner revokes a delegate session.
    event SessionRevoked(address indexed owner, address indexed delegate);

    /// @notice Emitted whenever clicks are recorded.
    /// @param player Address that triggered the click(s).
    /// @param amount Number of clicks recorded in this tx.
    /// @param newTotal New global total after the increment(s).
    event ClickRecorded(
        address indexed player,
        uint256 amount,
        uint256 newTotal
    );

    /// @notice Increment the global counter by 1 click.
    function click() external {
        address player = _resolvePlayer(msg.sender);
        unchecked {
            totalClicks += 1;
            clicksByAddress[player] += 1;
        }
        emit ClickRecorded(player, 1, totalClicks);
    }

    /// @notice Batch multiple clicks in a single transaction to save gas.
    /// @dev Includes a conservative upper bound to avoid accidental large values.
    /// @param times Number of clicks to record.
    function clickMany(uint256 times) external {
        address player = _resolvePlayer(msg.sender);
        require(times > 0, "times=0");
        require(times <= 100, "times too large");
        unchecked {
            totalClicks += times;
            clicksByAddress[player] += times;
        }
        emit ClickRecorded(player, times, totalClicks);
    }

    /// @notice Convenience view to read the global counter.
    /// @dev The public variable `totalClicks` already exposes an auto-getter; this is for clarity.
    function getTotalClicks() external view returns (uint256) {
        return totalClicks;
    }

    /// @notice Read how many clicks a specific address has contributed.
    function getAddressClicks(address account) external view returns (uint256) {
        return clicksByAddress[account];
    }

    // ---------------------------
    // Session management
    // ---------------------------
    /// @notice Authorize a delegate key to act as the owner until `expiresAt`.
    /// The owner must call this; then the delegate can call click/clickMany and
    /// clicks will be attributed to the owner. If `expiresAt` is 0, the session
    /// does not expire (must be revoked manually).
    function authorizeSession(address delegate, uint64 expiresAt) external {
        require(delegate != address(0), "delegate=0");
        require(
            expiresAt == 0 || expiresAt > block.timestamp,
            "expiry invalid"
        );
        sessionByDelegate[delegate] = Session({
            owner: msg.sender,
            expiresAt: expiresAt
        });
        emit SessionAuthorized(msg.sender, delegate, expiresAt);
    }

    /// @notice Revoke a previously authorized delegate session.
    function revokeSession(address delegate) external {
        Session memory s = sessionByDelegate[delegate];
        require(s.owner == msg.sender, "not owner");
        delete sessionByDelegate[delegate];
        emit SessionRevoked(msg.sender, delegate);
    }

    /// @notice Returns the resolved owner for a given delegate if valid, else address(0).
    function resolveOwnerForDelegate(
        address delegate
    ) external view returns (address) {
        Session memory s = sessionByDelegate[delegate];
        if (
            s.owner != address(0) &&
            (s.expiresAt == 0 || s.expiresAt >= block.timestamp)
        ) {
            return s.owner;
        }
        return address(0);
    }

    function _resolvePlayer(address caller) internal view returns (address) {
        Session memory s = sessionByDelegate[caller];
        if (
            s.owner != address(0) &&
            (s.expiresAt == 0 || s.expiresAt >= block.timestamp)
        ) {
            return s.owner;
        }
        return caller;
    }
}
