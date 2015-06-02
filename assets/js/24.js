/**
 * 24
 * 
 * @author Ahmad Zaky
 */

var Game = function(args) {
	// All of this will be private variables
	var goal = args && args.goal || 24;
	var n = args && args.n || 4;
	var maxNumber = args && args.maxNumber || 10;

	var answer = false, solved = false, fail = false;
	var bubbles = [];
	var numbers = [];

	var level = 0;
	var timeLeft = 0, timeStopper;

	var that = this;

	// Check if the current numbers can achieve the desired goal.
	// The technique being used is dynamic programming with bitmask on the indices.
	var checkAnswer = (function() {
		// The dp[mask] will contain an array, each of which will be an object containing
		// the value and the expression.
		var dp = [[]];

		// Fill the table in a bottom-up fashion
		for (var mask = 1; mask < (1 << n); ++mask) {
			// Array of the active bits
			var bits = [];
			for (var i = 0; i < n; ++i) {
				if (mask & (1 << i)) {
					bits.push(i);
				}
			}

			// Initialize the dp table with single element values
			if (bits.length === 1) {
				dp[mask] = [{
					value: numbers[bits[0]],
					expr: numbers[bits[0]]
				}];
			} else {
				// The set that indicates the used values
				var used = {};
				var temp = [];

				// Find two masks that can be combined to mask
				for (var mask1 = 1; mask1 < (1 << n); ++mask1) {
					if ((mask1 & mask) === mask1 && mask1 !== mask) {
						var mask2 = mask ^ mask1;
						if (!dp[mask1] || !dp[mask2]) continue;

						// Combine all the values in mask1 and mask2 to mask
						// Try all valid operators
						for (var i = 0; i < dp[mask1].length; ++i) {
							for (var j = 0; j < dp[mask2].length; ++j) {
								dp1 = dp[mask1][i];
								dp1.value = Number(dp1.value);
								dp2 = dp[mask2][j];
								dp2.value = Number(dp2.value);

								var possibilities = [
									{ // Addition
										value: dp1.value + dp2.value,
										expr: "(" + dp1.expr + ") + (" + dp2.expr + ")" 
									},
									{ // Subtraction
										value: dp1.value - dp2.value,
										expr: "(" + dp1.expr + ") - (" + dp2.expr + ")" 
									},
									{ // Subtraction
										value: dp2.value - dp1.value,
										expr: "(" + dp2.expr + ") - (" + dp1.expr + ")" 
									},
									{ // Multiplication
										value: dp1.value * dp2.value,
										expr: "(" + dp1.expr + ") * (" + dp2.expr + ")" 
									}];

								// Special case for division, make sure the denominator is not zero
								if (dp1.value) {
									possibilities.push({
										value: dp2.value / dp1.value,
										expr: "(" + dp2.expr + ") / (" + dp1.expr + ")" 
									});
								}
								if (dp2.value) {
									possibilities.push({
										value: dp1.value / dp2.value,
										expr: "(" + dp1.expr + ") / (" + dp2.expr + ")" 
									});
								}

								// Perform check on all of them
								possibilities.forEach(function(e) {
									if (!used[e.value]) {
										used[e.value] = true;
										temp.push(e);
									}
								});
							}
						}
					}
				}

				// Insert it into dp table
				if (temp.length) dp[mask] = temp;
			}
		}

		// Finally, check if goal can be achieved using all numbers
		var _answer = [];
		dp[(1 << n) - 1].forEach(function(e) {
			if (Math.abs(e.value - goal) < 1e-7) {
				_answer.push(e);
			}
		});
		return _answer;
	});

	// Randomly generate numbers.
	var generate = (function() {
		numbers = [];
		for (var i = 0; i < n; ++i) {
			numbers[i] = Math.floor(Math.random() * maxNumber) + 1;
		}
		answer = checkAnswer();
		if (!answer.length) {
			answer = false;
		} else {
			answer = answer[0].expr;
		}
	});

	// Bind DOM elements.
	(function() {
		that.dom = [];
		for (var i = 0; i < n; ++i) {
			that.dom[i] = document.getElementById("bubble-" + i);

		}
	}());

	// Action taken when two bubbles are combined: "Marry" them.
	this.marry = function(args) {
		if (this.over()) return;

		// check whether both arguments still available
		if (!args.lhs || !args.rhs || args.lhs === args.rhs || !bubbles[args.lhs] || !bubbles[args.rhs] || bubbles[args.lhs].used || bubbles[args.rhs].used) {
			return;
		}

		var last = bubbles.length;
		var value;
		var n1 = bubbles[args.lhs].value;
		var n2 = bubbles[args.rhs].value;

		switch (args.op) {
		case '+':
			value = n1 + n2;
			break;
		case '-':
			value = n1 - n2;
			break;
		case '*':
			value = n1 * n2;
			break;
		case '/':
			if (Math.abs(n2) < 1e-7) return;
			value = n1 / n2;
			break;
		default:
			return;
		}

		bubbles.push({
			i: last,
			value: value,
			lhs: args.lhs,
			rhs: args.rhs,
			used: false
		});
		bubbles[args.lhs].used = true;
		bubbles[args.rhs].used = true;

		// backtrack to see all numbers used
		var mask = 0;
		var dfs = function(i) {
			if (i < n) {
				mask |= (1 << i);
			} else {
				dfs(bubbles[i].lhs);
				dfs(bubbles[i].rhs);
			}
		}
		dfs(last);
		if (mask === (1 << n) - 1 && value === goal) {
			solved = true;
			clearInterval(timeStopper);
		}

		return bubbles[last];
	}

	// Separate combined bubbles: "Divorce" them.
	this.divorce = function(i) {
		if (this.over()) return;

		if (bubbles[i] && bubbles[i].hasOwnProperty('lhs') && bubbles[i].hasOwnProperty('rhs')) {
			var lhs = bubbles[bubbles[i].lhs];
			var rhs = bubbles[bubbles[i].rhs];
			lhs.used = rhs.used = false;
			bubbles[i] = undefined;

			return {
				lhs: lhs,
				rhs: rhs
			}
		}
	}

	// Restart game
	this.restart = function() {
		// force quit current game
		if (!this.over()) {
			clearInterval(timeStopper);
		}

		// A little workaround so nextLevel won't return void
		solved = true;
		fail = false;

		level = 0;
		return this.nextLevel();
	}

	// Go to the next level
	this.nextLevel = function() {
		if (!this.over() || this.lose()) {
			return;
		}

		generate();
		level++;
		bubbles = [];
		for (var i = 0; i < n; ++i) {
			bubbles[i] = {
				i: i,
				value: numbers[i],
				used: false
			}
		}
		solved = false;
		fail = false;

		// run the timer
		timeLeft = this.getTimeLimit();
		timeStopper = setInterval(function() {
			timeLeft--;
			if (timeLeft <= 0) {
				timeLeft = 0;
				fail = true;
				clearInterval(timeStopper);
			}
		}, 1000);

		// return the numbers
		return numbers;
	}

	// Guess if this level cannot be solved
	this.guessUnsolved = function() {
		if (!answer) {
			solved = true;
		} else {
			fail = true;
		}
		// stop timer
		clearInterval(timeStopper);

		if (this.win()) {
			return true;
		} else {
			return false;
		}
	}

	// Check whether we win or not
	this.win = function() {
		return solved;
	}

	// Check whether we lose or not
	this.lose = function() {
		return fail;
	}

	// Check whether the game is over or not
	this.over = function() {
		return this.win() || this.lose();
	}

	// Get the time limit for current level
	// TODO: tweak the formula
	this.getTimeLimit = function() {
		return Math.floor(100 / (level + 1)) + 10;
	}

	// Get the time left for the current level
	this.getTimeLeft = function() {
		return timeLeft;
	}

	// Get current level
	this.getLevel = function() {
		return level;
	}

	// Get score
	this.getScore = function() {
		return level + (this.win() ? 0 : -1);
	}

	// Get the answer IF the game is already over
	this.getAnswer = function() {
		if (!this.over()) {
			return "Nice try, don't cheat :)";
		} else {
			return answer;
		}
	}

	// Get the numbers
	this.getNumbers = function() {
		return numbers;
	}

	// Get the bubbles
	this.getBubbles = function() {
		return bubbles;
	}

	// Last but not the least:
	return this;
}
