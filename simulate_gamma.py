import numpy as np
import sys

alpha = float(sys.argv[1])
theta = float(sys.argv[2])
n = int(sys.argv[3])

samples = np.random.gamma(alpha, theta, n)
print(','.join(map(str, samples)))