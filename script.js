// @ts-check

/// <reference lib="DOM" />
/// <reference lib="DOM.Iterable" />
/// <reference lib="ES2022" />

/** @typedef {null | "right" | "left" | "up" | "down"} Direction */

class Snake {
	/** @type {Direction} */ direction = null
	/** @type {Direction} */ oldDirection = null

	/**
	 * @param {CanvasRenderingContext2D} context
	 * @param {number} squareSize
	 */
	constructor(context, squareSize){
		this.context = context
		this.squareSize = squareSize

		this.positions = /** @type {{ x: number; y: number }[]} */ ([
			{ x: squareSize * 1, y: squareSize * 2 },
			{ x: squareSize * 2, y: squareSize * 2 },
			{ x: squareSize * 3, y: squareSize * 2 },
			{ x: squareSize * 4, y: squareSize * 2 }
		])
	}

	Draw(){
		const { context, squareSize, positions } = this
		const head = /** @type {typeof positions[number]} */ (positions.at(-1))

		context.fillStyle = "#fa0"

		for(const { x, y } of positions.slice(0, -1)){
			context.fillRect(x, y, squareSize, squareSize)
		}

		context.fillStyle = "#bbb"
		context.fillRect(head.x, head.y, squareSize, squareSize)
	}

	Move(){
		const { squareSize, positions, direction } = this
		const head = /** @type {typeof positions[number]} */ (positions.at(-1))

		positions.shift()

		switch(direction){
			case "right":
				positions.push({ x: head.x + squareSize, y: head.y })
			break
			case "left":
				positions.push({ x: head.x - squareSize, y: head.y })
			break
			case "up":
				positions.push({ x: head.x, y: head.y - squareSize })
			break
			case "down":
				positions.push({ x: head.x, y: head.y + squareSize })
			break
		}

		this.oldDirection = direction
	}
}

/**
 * @param {number} min
 * @param {number} max
 */
function randomNumber(min, max){
	return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * @param {number} min
 * @param {number} value
 * @param {number} max
 */
function clamp(min, value, max){
	return Math.max(min, Math.min(value, max))
}

class Food {
	/** @type {number} */ x
	/** @type {number} */ y
	/** @type {`rgb(${number}, ${number}, ${number})`} */ color

	/**
	 * @param {CanvasRenderingContext2D} context
	 * @param {number} width
	 * @param {number} height
	 * @param {number} squareSize
	 */
	constructor(context, width, height, squareSize){
		this.context = context
		this.width = width
		this.height = height
		this.squareSize = squareSize
	}

	/** @param {Snake["positions"]} snakePositions */
	New(snakePositions){
		this.color = `rgb(${randomNumber(0, 255)}, ${randomNumber(0, 255)}, ${randomNumber(0, 255)})`
		this.SetPosition(snakePositions)
	}

	Draw(){
		const { context, color, squareSize, x, y } = this

		context.fillStyle = color
		context.fillRect(x, y, squareSize, squareSize)
	}

	/** @param {Snake["positions"]} snakePositions */
	SetPosition(snakePositions){
		const { width, height, squareSize } = this

		const x = this.x = Math.round(randomNumber(0, width - squareSize) / squareSize) * squareSize
		const y = this.y = Math.round(randomNumber(0, height - squareSize) / squareSize) * squareSize

		for(const position of snakePositions){
			if(position.x === x && position.y === y){
				this.SetPosition(snakePositions)
				break
			}
		}
	}
}

class Game {
	started = false
	audio = new Audio("assets/audio.mp3")

	/**
	 * @param {number} interval
	 * @param {number} squareSize
	 */
	constructor(interval = 100, squareSize = 30){
		this.interval = interval
		this.squareSize = squareSize
		this.audio.volume = .8

		const main = (document.body ?? document).getElementsByTagName("main")[0]
		const canvas = this.canvas = /** @type {HTMLCanvasElement} */ (main.querySelector("canvas"))
		const context = this.context = /** @type {CanvasRenderingContext2D} */ (canvas.getContext("2d"))
		const header = /** @type {HTMLElement} */ (main.querySelector("header"))

		let { width, height } = canvas

		if(width && !height) height = width
		else if(height && !width) width = height
		else{
			const size = squareSize * Math.min(
				// Size by window width
				clamp(5, Math.round(self.innerWidth / squareSize) - 1, squareSize),
				// Size by window height
				clamp(5, Math.round(.75 * self.innerHeight / squareSize), squareSize)
			)

			width = height = canvas.width = canvas.height = size
		}

		this.width = canvas.width = width
		this.height = canvas.height = height

		const menu = this.menu = /** @type {HTMLElement} */ (main.querySelector("#menu"))
		this.score = /** @type {HTMLElement} */ (header.querySelector(".score"))
		this.finalScore = /** @type {HTMLSpanElement} */ (menu.querySelector(".score.final"))
		this.highestScore = /** @type {HTMLSpanElement} */ (menu.querySelector(".score.highest"))
		this.playButton = /** @type {HTMLButtonElement} */ (menu.querySelector("button"))

		const snake = this.snake = new Snake(context, squareSize)
		const food = this.food = new Food(context, width, height, squareSize)

		food.New(snake.positions)
		food.Draw()
		snake.Draw()
		this.DrawGrid()

		window.addEventListener("keydown", event => {
			switch(event.key){
				case "ArrowRight": {
					const { positions, oldDirection } = this.snake

					if(positions.length === 1 || oldDirection !== "left"){
						this.snake.direction = "right"
					}
				}
				break
				case "ArrowLeft": {
					const { positions, oldDirection } = this.snake

					if(positions.length === 1 || oldDirection !== "right"){
						this.snake.direction = "left"
					}
				}
				break
				case "ArrowUp": {
					const { positions, oldDirection } = this.snake

					if(positions.length === 1 || oldDirection !== "down"){
						this.snake.direction = "up"
					}
				}
				break
				case "ArrowDown": {
					const { positions, oldDirection } = this.snake

					if(positions.length === 1 || oldDirection !== "up"){
						this.snake.direction = "down"
					}
				}
				break
				default: return
			}

			event.preventDefault()

			if(!this.started) this.Start()
		})

		this.playButton.addEventListener("click", event => {
			event.preventDefault()
			this.Reset()
		})
	}

	Start(){
		this.started = true

		const { context, snake, food, width, height, interval } = this

		snake.Move()

		if(this.CheckCollision()) return this.GameOver()

		context.clearRect(0, 0, width, height)
		this.CheckExtreme()
		this.CheckEat()
		food.Draw()
		snake.Draw()
		this.DrawGrid()

		setTimeout(this.Start.bind(this), interval)
	}

	CheckEat(){
		const { snake: { positions }, food, audio, score } = this
		const head = /** @type {typeof positions[number]} */ (positions.at(-1))

		if(head.x === food.x && head.y === food.y){
			positions.push(head)
			food.New(positions)
			score.innerText = (Number(score.innerText) + 1).toString()
			audio.play()
		}
	}

	CheckExtreme(){
		const { snake: { positions }, width, height, squareSize } = this
		const head = /** @type {typeof positions[number]} */ (positions.at(-1))

		if(head.x < 0) head.x = width - squareSize
		if(head.y < 0) head.y = height - squareSize
		if(head.x > width - squareSize) head.x = 0
		if(head.y > height - squareSize) head.y = 0
	}

	CheckCollision(){
		const { snake: { positions } } = this
		const head = /** @type {typeof positions[number]} */ (positions.at(-1))

		return positions.slice(0, -2).some(position => position.x === head.x && position.y === head.y)
	}

	GameOver(){
		const { canvas, score: { innerText: scoreText }, menu, playButton, finalScore, highestScore } = this

		canvas.classList.add("blur")
		finalScore.innerText = scoreText
		menu.ariaHidden = null
		menu.hidden = false

		playButton.focus()

		const localScore = localStorage.getItem("score")

		if(!localScore || Number(scoreText) > Number(localScore)){
			localStorage.setItem("score", scoreText)
			highestScore.innerText = scoreText
		}else highestScore.innerText = localScore
	}

	Reset(){
		const { canvas, context, width, height, squareSize, menu, score, finalScore } = this

		const snake = this.snake = new Snake(context, squareSize)
		const food = this.food = new Food(context, width, height, squareSize)

		context.clearRect(0, 0, width, height)
		food.New(snake.positions)
		food.Draw()
		snake.Draw()
		this.DrawGrid()

		menu.hidden = true
		menu.ariaHidden = "true"
		score.innerText = finalScore.innerText = "0"
		canvas.classList.remove("blur")

		this.started = false
	}

	DrawGrid(){
		const { context, squareSize, width, height } = this

		context.lineWidth = 1
		context.strokeStyle = "#444"

		for(let i = squareSize; i < width; i += squareSize){
			context.beginPath()
			context.lineTo(i, 0)
			context.lineTo(i, height)
			context.stroke()

			context.beginPath()
			context.lineTo(0, i)
			context.lineTo(width, i)
			context.stroke()
		}
	}
}

new Game(100, 30)
