/* .js files add interaction to your website */
/* fact generator */
var factList = [
  "90% of the ocean's apex predators have been wiped out by humans in 55 years.", 
  "The number of overfished stocks have tripled in just half a century, with about 1/3 of stocks being overfished today.", 
  "Around 4 million fishing vessels now ply the oceans, many of which are becoming more capable of catching more fish."
];

//get the <p> tag
var fact = document.getElementById("fact");
/* gets the button */
var factgen = document.getElementById("factgen");
var count = 0;

if (factgen) {
  factgen.addEventListener("click", displayFact);
}

function displayFact() {
  //go through the array of facts
  fact.innerHTML = factList[count];
  count++;
  if (count == factList.length) {
    count = 0;
  }
}
