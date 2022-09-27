


























const lg = console.log


function checkActions(actions: number[]): string | false  {
    lg(actions);
    const expected = [80, 67, 89, 55, 100, 102, 50, 64];
    expected[3] += expected[0] / 2;
    lg(expected);
    if (actions.length < expected.length) {
        lg('actions < expected')
        return false;
    }
    const recent = actions.slice(actions.length - expected.length);
    lg(recent)
    for (let i = 0; i < expected.length; i += 1) {
        lg({ expected: expected[i], 'actions calculated': recent[i] + i * (i + 1), [`code ${recent[i]}`] : String.fromCharCode(recent[i]) })
        // x + n x (n+1)  // n = 0, n
        //0 80 = x => x = 80 => P
        //1 67 = x + 2 => x = 65 => A
        //2 89 = x + 2 x (2 + 1) = x + 2 x 3 = x + 6 => x = 83 => S
        //3 95 = x + 3 x 4 = x + 12 => x = 83 => S
        //4 100 = x + 4 x 5 = x + 20 => x = 80 => P
        //5 102 = x + 5 x 6 = x + 30 => x = 72 => H
        //6 50 = x + 6 x 7 = x + 42 => x = 8 => space
        //7 64 = x + 7 x 8 = x + 56 => x = 8 => space
        if (expected[i] !== recent[i] + i * (i + 1)) {
            lg('actionsslice error')
            return false;
      }
    }
    return 'password';
  };
// 16 = SHIFT

const actions1 = [16, 80,  65, 83, 83, 80, 72, 8, 8];
const macOS =    [16, 80, 65, 83, 83, 80, 72, 8, 8]

console.log(checkActions(actions1));



