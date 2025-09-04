/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from "@google/genai";

// --- DOM Elements ---
const startScreen = document.getElementById('start-screen')!;
const gameScreen = document.getElementById('game-screen')!;
const endScreen = document.getElementById('end-screen')!;
const difficultyButtons = document.querySelectorAll('.difficulty-button');
const playAgainButton = document.getElementById('play-again-button')!;
const questionText = document.getElementById('question-text')!;
const optionsContainer = document.getElementById('options-container')!;
const scoreContainer = document.getElementById('score-container')!;
const finalScore = document.getElementById('final-score')!;

// --- Audio Elements ---
const sfx = {
  start: new Audio('data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA'), // Simple beep
  correct: new Audio('data:audio/wav;base64,UklGRkIAAABXQVZFZm10IBAAAAABAAIARKwAABCxAgAEABAAZGF0YUgAAAD8/wD8/wD8/wD8/wD8/wD8/wD8/wD9/wD9/wD9/wD9/wD9/wD9/wD9/wD9/wD9/wD9/wD9/wD9/wD+/wD+/wD+/wD+/wD+/wD+/wD+/wD+/wD+/wD+/wD/AAAAAAAAAAAAAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgADAAQAAwAEAAMABAA'), // Ascending tone
  incorrect: new Audio('data:audio/wav;base64,UklGRkIAAABXQVZFZm10IBAAAAABAAIARKwAABCxAgAEABAAZGF0YUgAAADAAwAAwAEAAMABAAACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgABAQABAQABAQABAQABAQABAQABAQABAQABAQABAQABAQABAQAAAAAAAAAAAP7/AP7/AP7/AP7/AP7/AP7/AP7/AP7/AP7/AP7/AP7/AP7/AP3/AP3/AP3/AP3/AP3/AP3/AP3/AP3/AP3/AP3/AP3/AP3/APz/APz/APz/APz/APz/APz/APz/APz/APz/APz/APz/APz/APz/'), // Descending tone
  end: new Audio('data:audio/wav;base64,UklGRqQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAAABkYXRhgAAAAAABAQICAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8gISIjJCUmJygpKissLS4vMDEyMzQ1Njc4OTo7PD0+P0BBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWltcXV5fYGFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6e3x9fn+AgYKDhIWGh4iJiouMjY6PkJGSk5SVlpeYmZqbnJ2en6ChoqOkpaanqKmqq6ytrq+wsbKztLW2t7i5uru8vb6/wMHCw8TFxsfIycrLzM3Oz9DR0tPU1dbX2Nna29zd3t/g4eLj5OXm5+jp6uvs7e7v8PHy8/T19vf4+fr7/P3+/w==') // Success chime
};

// --- Game State ---
let score = 0;
let questionsAnswered = 0;
const TOTAL_QUESTIONS = 5;
let currentCorrectAnswerIndex: number | null = null;
let awaitingNextQuestion = false;
let currentDifficulty: string = 'Médio'; // Default difficulty

// --- Gemini AI Setup ---
const API_KEY = process.env.API_KEY;
const ai = new GoogleGenAI({ apiKey: API_KEY });

const questionSchema = {
  type: Type.OBJECT,
  properties: {
    question: {
      type: Type.STRING,
      description: "O problema de matemática com um tema futurista/espacial.",
    },
    options: {
      type: Type.ARRAY,
      description: "Um array de 4 respostas possíveis, uma das quais é a correta.",
      items: { type: Type.STRING },
    },
    correctAnswerIndex: {
      type: Type.INTEGER,
      description: "O índice (0-3) da resposta correta no array 'options'.",
    },
  },
  required: ["question", "options", "correctAnswerIndex"],
};

// --- Functions ---

function playSound(sound: HTMLAudioElement) {
    sound.currentTime = 0;
    sound.play().catch(error => console.error("Audio playback error:", error));
}

async function getNewQuestion() {
  awaitingNextQuestion = true;
  questionText.textContent = "Gerando transmissão...";
  optionsContainer.innerHTML = "";

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Gere um novo problema de matemática para o 7º ano com um tema futurista ou espacial. A dificuldade deve ser ${currentDifficulty}. Forneça quatro opções de múltipla escolha.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: questionSchema,
        systemInstruction: `Você é uma IA futurista criando problemas de matemática para cadetes em uma academia espacial. Os problemas devem ser adequados para o nível do 7º ano com uma dificuldade de ${currentDifficulty}.`
      },
    });

    const questionData = JSON.parse(response.text);
    displayQuestion(questionData);
  } catch (error) {
    console.error("Error fetching question:", error);
    questionText.textContent = "Erro na transmissão. Por favor, tente novamente.";
  } finally {
     awaitingNextQuestion = false;
  }
}

function displayQuestion(data: { question: string; options: string[]; correctAnswerIndex: number; }) {
  questionText.textContent = data.question;
  optionsContainer.innerHTML = "";
  currentCorrectAnswerIndex = data.correctAnswerIndex;

  data.options.forEach((option, index) => {
    const button = document.createElement("button");
    button.textContent = option;
    button.classList.add("option-button");
    button.addEventListener("click", () => handleAnswer(index, button));
    optionsContainer.appendChild(button);
  });
}

function handleAnswer(selectedIndex: number, selectedButton: HTMLButtonElement) {
    if (awaitingNextQuestion) return;

    const allOptions = optionsContainer.querySelectorAll('.option-button');
    allOptions.forEach(btn => (btn as HTMLButtonElement).disabled = true);

    const isCorrect = selectedIndex === currentCorrectAnswerIndex;

    if (isCorrect) {
        selectedButton.classList.add('correct');
        score++;
        updateScore();
        playSound(sfx.correct);
    } else {
        selectedButton.classList.add('incorrect');
        if (currentCorrectAnswerIndex !== null) {
            (allOptions[currentCorrectAnswerIndex] as HTMLElement).classList.add('correct');
        }
        playSound(sfx.incorrect);
    }
    
    questionsAnswered++;

    setTimeout(() => {
        if (questionsAnswered >= TOTAL_QUESTIONS) {
            showEndScreen();
        } else {
            getNewQuestion();
        }
    }, 2000);
}

function updateScore() {
  scoreContainer.textContent = `PONTUAÇÃO: ${score}`;
}

function startGame() {
  score = 0;
  questionsAnswered = 0;
  updateScore();
  startScreen.classList.add('hidden');
  endScreen.classList.add('hidden');
  gameScreen.classList.remove('hidden');
  playSound(sfx.start);
  getNewQuestion();
}

function showEndScreen() {
    gameScreen.classList.add('hidden');
    endScreen.classList.remove('hidden');
    finalScore.textContent = `Sua pontuação final é ${score} de ${TOTAL_QUESTIONS}`;
    playSound(sfx.end);
}

// --- Event Listeners ---
difficultyButtons.forEach(button => {
    button.addEventListener('click', () => {
        const difficulty = (button as HTMLElement).dataset.difficulty;
        if (difficulty) {
            currentDifficulty = difficulty;
            startGame();
        }
    });
});
playAgainButton.addEventListener('click', () => {
    endScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
});