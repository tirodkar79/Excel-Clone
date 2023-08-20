for(let i = 0; i < rows; i++){
    for(let j = 0; j < cols; j++){
        let cell = document.querySelector(`.cell[rid="${i}"][cid="${j}"]`);
        cell.addEventListener("blur", (e)=> {
            let address = addressBar.value;
            let [activeCell, cellProp] = getCellAndCellProp(address);
            let enteredData = activeCell.innerText;
            
            if(enteredData == cellProp.value){
                console.log("is same", address)
                return;
            }

            cellProp.value = enteredData
            console.log("Its coming here", address)
            //If data modifies/updates
            removeChildFromParent(cellProp.formula)
            cellProp.formula = ""
            updateChildrenCells(address)
        })
    }
}

let formulaBar = document.querySelector(".formula-bar")
formulaBar.addEventListener("keydown", async (e) => {
    let inputFormula = formulaBar.value
    if(e.key === "Enter"){
        let address = addressBar.value
        if (inputFormula) {

            
            addChildToGraphComponent(inputFormula, address)
            // Check formula is cyclic or not, than only evaluate
            // True => cyclic, False => Not cyclic
            let cycleResponse = isGraphCyclic(graphComponentMatrix);
            console.log("cycleResponse", cycleResponse)
            if (cycleResponse) {
                // alert("Your formula is cyclic")
                let response = confirm("Your formula is cyclic. Do you want to trace your path?")
                while (response == true) {
                    // Keep on tracing color until user is satisfied
                    // I want to complete full iteration of color tracking, so I will attach await here also
                    await isGraphCyclicTracePath(graphComponentMatrix, cycleResponse)
                    response = confirm("Your formula is cyclic. Do you want to trace your path?")
                }
                
                removeChildFromGraphComponent(inputFormula)
                return;
            }
            
            let evaluatedValue = evaluateFormula(inputFormula);
            
            // If change in formula, break old P-C relation, evaluate new formula, add new P-C relation
            let [cell, cellProp] = getCellAndCellProp(address)
            if(inputFormula !== "" && inputFormula !== cellProp.formula){
                removeChildFromParent(cellProp.formula)
            }

            // To update UI and cellProp in DB
            setCellUIAndCellProp(evaluatedValue, inputFormula, address);
            addChildToParent(inputFormula)
            console.log(sheetDB)
        }
        else{
            // To update UI and cellProp in DB
            setCellUIAndCellProp("", "", address);
        }

        updateChildrenCells(address)
    }
})

function addChildToGraphComponent(formula, childAddress) {
    let [crid, ccid] = decodeRIDCIDFromAddress(childAddress);
    let encodedFormula = formula.toUpperCase().split(" ");
    for (let i = 0; i < encodedFormula.length; i++){
        let asciiValue = encodedFormula[i].charCodeAt(0)
        if (asciiValue >= 65 && asciiValue <= 90) {
            let [prid, pcid] = decodeRIDCIDFromAddress(encodedFormula[i])
            // B1: A1 + 10
            // rid -> i, cid -> j
            graphComponentMatrix[prid][pcid].push([crid, ccid])
        }
    }

}

function removeChildFromGraphComponent(formula) {
    let encodedFormula = formula.toUpperCase().split(" ");
    for (let i = 0; i < encodedFormula.length; i++){
        let asciiValue = encodedFormula[i].charCodeAt(0)
        if (asciiValue >= 65 && asciiValue <= 90) {
            let [prid, pcid] = decodeRIDCIDFromAddress(encodedFormula[i])
            // B1: A1 + 10
            // rid -> i, cid -> j
            graphComponentMatrix[pcid][prid].pop()
        }
    }

}

function updateChildrenCells(parentAddress){
    let [parentCell, parentCellProp] = getCellAndCellProp(parentAddress)
    let children = parentCellProp.children

    for(let i = 0; i < children.length; i++){
        let childAddress = children[i];
        let [childCell, childCellProp] = getCellAndCellProp(childAddress)
        let childFormula = childCellProp.formula

        let evaluatedValue = evaluateFormula(childFormula)
        setCellUIAndCellProp(evaluatedValue, childFormula, childAddress)
        updateChildrenCells(childAddress)
    }
}

function addChildToParent(formula){
    let childAddress = addressBar.value
    let encodedFormula = formula.toUpperCase().split(" ");
    for(let i = 0; i < encodedFormula.length; i++){
        let asciiValue = encodedFormula[i].charCodeAt(0);
        if(asciiValue >= 65 && asciiValue <= 90){
            let [parentCell, parentCellProp] = getCellAndCellProp(encodedFormula[i])
            parentCellProp.children.push(childAddress);
        }
    }
}

function removeChildFromParent(formula){
    let childAddress = addressBar.value
    let encodedFormula = formula.toUpperCase().split(" ");
    for(let i = 0; i < encodedFormula.length; i++){
        let asciiValue = encodedFormula[i].charCodeAt(0);
        if(asciiValue >= 65 && asciiValue <= 90){
            let [parentCell, parentCellProp] = getCellAndCellProp(encodedFormula[i])
            let idx = parentCellProp.children.indexOf(childAddress)
            parentCellProp.children.splice(idx, 1);
        }
    }
}

function evaluateFormula(formula){
    let encodedFormula = formula.toUpperCase().split(" ");
    for(let i = 0; i < encodedFormula.length; i++){
        let asciiValue = encodedFormula[i].charCodeAt(0);
        
        if(asciiValue >= 65 && asciiValue <= 90){
            let [cell, cellProp] = getCellAndCellProp(encodedFormula[i])
            encodedFormula[i] = cellProp.value
        }
    }

    let decodedFormula = encodedFormula.join(" ");
    console.log("decodedFormula", decodedFormula)
    return eval(decodedFormula)
}

function setCellUIAndCellProp(evaluatedValue, formula, address){
    let [cell, cellProp] = getCellAndCellProp(address);

    // UI Update
    cell.innerText = evaluatedValue;
    // DB Update
    cellProp.value = evaluatedValue;
    cellProp.formula = formula
}