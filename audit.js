//Lighthouse dependency
import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';
import { spawn } from 'child_process';

//This will be a local url generated by live server
const url = 'http://127.0.0.1:5500/index.html';

function average(arr) {
  return arr.reduce((sum, x) => sum + x, 0) / arr.length;
}

async function cpuTimes(n) {
    let times = []

    for (let i = 1; i <= n; i++) {
        // Launch Chrome in headless mode
        const chrome = await launch({ chromeFlags: ['--headless'] });

        //Options
        const options = {
            port: chrome.port,
            output: 'json',
            logLevel: 'info',
        };

        //Run the audit
        const result = await lighthouse(url, options);

        //For testing
        //console.log(result.lhr.audits['mainthread-work-breakdown'].details.items)
        
        //Find the total duration of loading the webpage
        let sum = 0;
        for (const item of result.lhr.audits['mainthread-work-breakdown'].details.items) {
          //console.log(item)
          sum += item.duration;
        }

        let cpuTime = sum / 1000 //Concert from ms to seconds

        times.push(sum);

        //Kill chrome
        await chrome.kill();
    }

    return times;
}

//Return a promise of an array of values from simulate_gamma.py
async function getGammaSamples(alpha, theta, n) {
  return new Promise((resolve, reject) => {
    const process = spawn('python3', ['simulate_gamma.py', alpha, theta, n]);

    let data = '';

    process.stdout.on('data', (chunk) => {
      data += chunk.toString();
    });

    process.stderr.on('data', (err) => {
      console.error('Python error:', err.toString());
    });

    process.on('close', () => {
      const gamma_vals = data.trim().split(',').map(Number);
      resolve(gamma_vals);
    });

    process.on('error', reject);
  });
}


async function audit() {
  /*
  Assumtions:
  1. Loading time is normally distributed
      Loading time mean and variance will be estimated by
      repeatedely opening the page and using lighthouse to record load time
  2. CPU power consumtion follows a gamma distribution with:
      mean (mu) = 4 watts
      variance (sigma^2) = 9 watts^2

      Therefore, cpu power consumtion will have the following two parameters:
      alpha = mu^2/sigma^2 = 1.78
      theta = sigma^2/mu = 2.25
  3. Total energy consumtion (joules) = Loading time (seconds) * power (watts)
  4. Chat GPT query energy consumtion also follows a gamma distribution with:
      mean (mu) = 1800 joules
      variance (sigma^2) = 800

      Therefore,
      alpha = 5.06
      theta = 356

  */
  let n = 25;
  
  let times = await cpuTimes(n);

  let cpu_gamma_vals = await getGammaSamples(1.78, 2.25, n);
  
  let query_gamma_vals = await getGammaSamples(5.06, 356, n);

  let ratios = query_gamma_vals.map((val, i) => val / (times[i] * cpu_gamma_vals[i]))

  const avg = average(ratios);

  console.log(ratios);
  console.log(avg);
}

audit();