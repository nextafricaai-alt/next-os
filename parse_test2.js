const code = readFile('web/os-childcare.jsx');
let pDepth = 0;
let bDepth = 0;
let sqDepth = 0;
for (let i = 0; i < code.length; i++) {
  if (code[i] === '(') pDepth++;
  if (code[i] === ')') pDepth--;
  if (code[i] === '{') bDepth++;
  if (code[i] === '}') bDepth--;
  if (code[i] === '[') sqDepth++;
  if (code[i] === ']') sqDepth--;
}
print("P:", pDepth, "B:", bDepth, "S:", sqDepth);
