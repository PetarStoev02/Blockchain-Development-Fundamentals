// SPDX-License-Identifier: MIT

pragma solidity ^0.8.28;

contract TemperatureConverter {

    /// @notice Converts a temperature from Celsius to Fahrenheit
    /// @param celsius Temperature in Celsius
    /// @return fahrenheit Temperature in Fahrenheit
    function toFahrenheit(uint256 celsius) external pure returns (uint256 fahrenheit) {
        fahrenheit = (celsius * 9) / 5 + 32;
    }

    /// @notice Converts a temperature from Fahrenheit to Celsius
    /// @param fahrenheit Temperature in Fahrenheit
    /// @return celsius Temperature in Celsius
    function toCelsius(uint256 fahrenheit) external pure returns (uint256 celsius) {
        // Prevent underflow
        require(fahrenheit >= 32, "Input value must be at least 32 to avoid underflow");
        celsius = ((fahrenheit - 32) * 5) / 9;
    }
}