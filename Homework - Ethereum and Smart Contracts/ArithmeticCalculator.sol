// SPDX-License-Identifier: MIT

pragma solidity 0.8.28;

error InvalidOperation();

contract ArithmeticCalculator {

    function add (int256 a, int256 b) pure external returns (int sum) {
        sum = a+b;
    }

    function subtract (int256 a, int256 b) pure external returns (int sum) {
        sum = a-b;
    }

    function multiply (int256 a, int256 b) pure external returns (int sum) {
        sum = a*b;
    }

    function divide (int256 a, int256 b) pure external returns (int sum) {
        if(b!=0){
            sum = a/b;
        }else {
            revert InvalidOperation();
        }
    }
    
    
}