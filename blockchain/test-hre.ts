import hre from "hardhat";
console.log("Keys in HRE:", Object.keys(hre));
if (hre.ethers) {
    console.log("Ethers found!");
} else {
    console.log("Ethers NOT found in HRE.");
}
