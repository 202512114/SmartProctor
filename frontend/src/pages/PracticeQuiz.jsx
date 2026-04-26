import { useEffect, useRef, useState } from 'react'
import { practiceQuizzes, practiceQuestions } from '../data/mockData'
import {
    Gamepad, Play, RefreshCw, BookOpen, FileText,
    XCircle, Calculator, Microscope, Scroll, Code, Globe
} from '../components/Icons'

const quizIcons = {
    101: <Calculator size={40} color="var(--accent-blue)" />,
    102: <Microscope size={40} color="var(--accent-green)" />,
    103: <Scroll size={40} color="var(--accent-orange)" />,
    104: <Code size={40} color="var(--accent-red)" />,
    105: <Globe size={40} color="var(--accent-purple)" />,
    106: <BookOpen size={40} color="var(--accent-blue)" />
}

function shuffleArray(arr) {
    return [...arr].sort(() => Math.random() - 0.5)
}

export default function PracticeQuiz() {
    const gameRef = useRef(null)

    const [activeQuiz, setActiveQuiz] = useState(null)
    const [questions, setQuestions] = useState([])
    const [currentQ, setCurrentQ] = useState(0)
    const [birdY, setBirdY] = useState(210)
    const [velocity, setVelocity] = useState(0)
    const [pipeX, setPipeX] = useState(760)
    const [score, setScore] = useState(0)
    const [running, setRunning] = useState(false)
    const [gameOver, setGameOver] = useState(false)
    const [won, setWon] = useState(false)
    const [message, setMessage] = useState('')

    const gameHeight = 480
    const birdX = 90
    const birdSize = 34
    const pipeWidth = 130
    const laneHeight = gameHeight / 4

    const startQuiz = (quiz) => {
        const quizQs = practiceQuestions.filter(q => q.quizId === quiz.id)
        const randomQs = shuffleArray(quizQs).slice(0, 10)

        setActiveQuiz(quiz)
        setQuestions(randomQs)
        setCurrentQ(0)
        setBirdY(210)
        setVelocity(0)
        setPipeX(760)
        setScore(0)
        setRunning(true)
        setGameOver(false)
        setWon(false)
        setMessage('')
    }

    const resetAll = () => {
        setActiveQuiz(null)
        setQuestions([])
        setCurrentQ(0)
        setBirdY(210)
        setVelocity(0)
        setPipeX(760)
        setScore(0)
        setRunning(false)
        setGameOver(false)
        setWon(false)
        setMessage('')
    }

    const restart = () => {
        if (activeQuiz) startQuiz(activeQuiz)
    }

    const flap = () => {
        if (!running || gameOver || won) return
        setVelocity(-8)
    }

    const getBirdLane = (yValue = birdY) => {
        const centerY = yValue + birdSize / 2
        return Math.max(0, Math.min(3, Math.floor(centerY / laneHeight)))
    }

    const checkCollision = (nextBirdY, nextPipeX) => {
        const q = questions[currentQ]
        if (!q) return

        if (nextBirdY <= 0 || nextBirdY + birdSize >= gameHeight) {
            setGameOver(true)
            setRunning(false)
            setMessage('Bird crashed!')
            return
        }

        const birdRight = birdX + birdSize
        const pipeRight = nextPipeX + pipeWidth

        if (birdRight >= nextPipeX && birdX <= pipeRight) {
            const lane = getBirdLane(nextBirdY)
            const correctLane = q.correct

            if (lane !== correctLane) {
                setGameOver(true)
                setRunning(false)
                setMessage('Wrong answer gap!')
                return
            }
        }

        if (pipeRight < birdX) {
            const lane = getBirdLane(nextBirdY)
            const correctLane = q.correct

            if (lane === correctLane) {
                const newScore = score + 1
                setScore(newScore)

                if (currentQ === questions.length - 1) {
                    setWon(true)
                    setRunning(false)
                    setMessage('You cleared all questions!')
                } else {
                    setCurrentQ(prev => prev + 1)
                    setPipeX(760)
                    setMessage('Correct!')
                    setTimeout(() => setMessage(''), 600)
                }
            } else {
                setGameOver(true)
                setRunning(false)
                setMessage('Wrong answer gap!')
            }
        }
    }

    useEffect(() => {
        if (!running || gameOver || won) return

        const interval = setInterval(() => {
            setVelocity(v => {
                const newV = v + 0.6

                setBirdY(y => {
                    const newY = y + newV

                    setPipeX(x => {
                        const newX = x - 5
                        checkCollision(newY, newX)
                        return newX
                    })

                    return newY
                })

                return newV
            })
        }, 30)

        return () => clearInterval(interval)
    }, [running, gameOver, won, currentQ, score, questions])

    useEffect(() => {
        const handleKey = (e) => {
            if (e.code === 'Space') flap()
        }

        window.addEventListener('keydown', handleKey)
        return () => window.removeEventListener('keydown', handleKey)
    }, [running])

    if (gameOver || won) {
        return (
            <div className="animate-slide-up" style={{ maxWidth: 500, margin: '0 auto', textAlign: 'center' }}>
                <div className="glass-card" style={{ padding: 48 }}>
                    <div style={{ fontSize: 80, marginBottom: 16 }}>
                        {won ? '🏆' : '💥'}
                    </div>

                    <h1 style={{ marginBottom: 8 }}>
                        {won ? 'You Win!!' : 'Game Over!'}
                    </h1>

                    <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
                        {message}
                    </p>

                    <div style={{ fontSize: 48, fontWeight: 800, color: won ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                        {score}/{questions.length}
                    </div>

                    <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
                        {won ? 'All answers are correct!' : 'One wrong answer ended the game.'}
                    </p>

                    <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                        <button className="btn btn-primary" onClick={restart}>
                            <RefreshCw size={16} /> Retry
                        </button>
                        <button className="btn btn-secondary" onClick={resetAll}>
                            <BookOpen size={16} /> All Quizzes
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    if (activeQuiz && questions.length > 0) {
        const q = questions[currentQ]

        return (
            <div className="animate-fade-in" style={{ maxWidth: 950, margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div>
                        <h2 style={{ margin: 0 }}>🐦 Flappy Quiz - {activeQuiz.title}</h2>
                        <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>
                            Tap screen or press Space to flap. Pass through correct answer pipe.
                        </p>
                    </div>

                    <button className="btn btn-secondary btn-sm" onClick={resetAll}>
                        <XCircle size={14} /> Exit
                    </button>
                </div>

                <div
                    style={{
                        background: 'rgba(15,23,42,0.9)',
                        padding: 16,
                        borderRadius: 16,
                        marginBottom: 12
                    }}
                >
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>
                        Question {currentQ + 1} of {questions.length} | Score: {score}
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 700 }}>{q.text}</div>
                </div>

                <div
                    ref={gameRef}
                    onClick={flap}
                    style={{
                        height: gameHeight,
                        borderRadius: 20,
                        overflow: 'hidden',
                        position: 'relative',
                        cursor: 'pointer',
                        background: 'linear-gradient(#70d6e8 0%, #8ee5f2 65%, #dff7ff 65%, #b6e26b 100%)',
                        border: '3px solid rgba(255,255,255,0.25)',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.35)'
                    }}
                >
                    <div
                        style={{
                            position: 'absolute',
                            left: birdX,
                            top: birdY,
                            width: birdSize,
                            height: birdSize,
                            fontSize: 32,
                            zIndex: 10,
                            transition: 'top 0.03s linear'
                        }}
                    >
                        🐦
                    </div>

                    {[0, 1, 2, 3].map((lane) => {
                        const top = lane * laneHeight
                        const isCorrect = lane === q.correct

                        return (
                            <div
                                key={lane}
                                style={{
                                    position: 'absolute',
                                    left: pipeX,
                                    top,
                                    width: pipeWidth,
                                    height: laneHeight - 8,
                                    background: isCorrect ? 'rgba(34,197,94,0.92)' : 'rgba(22,163,74,0.95)',
                                    border: '4px solid #15803d',
                                    borderRadius: 10,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    textAlign: 'center',
                                    padding: 8,
                                    fontWeight: 800,
                                    fontSize: 13,
                                    color: '#fff',
                                    textShadow: '1px 1px 2px #000'
                                }}
                            >
                                <div>
                                    <div style={{ fontSize: 16, marginBottom: 4 }}>
                                        {String.fromCharCode(65 + lane)}
                                    </div>
                                    {q.options[lane]}
                                </div>
                            </div>
                        )
                    })}

                    <div
                        style={{
                            position: 'absolute',
                            bottom: 10,
                            left: 0,
                            right: 0,
                            textAlign: 'center',
                            color: '#0f172a',
                            fontWeight: 800,
                            fontSize: 14
                        }}
                    >
                        Tap to fly upward. Gravity pulls you down.
                    </div>

                    {message && (
                        <div
                            style={{
                                position: 'absolute',
                                top: 18,
                                left: 0,
                                right: 0,
                                textAlign: 'center',
                                fontSize: 28,
                                fontWeight: 900,
                                color: '#fff',
                                textShadow: '2px 2px 4px #000'
                            }}
                        >
                            {message}
                        </div>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="animate-slide-up">
            <div className="page-header">
                <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Gamepad size={28} /> Practice Quizzes
                </h1>
                <p>Fun and interactive quizzes to improve your understanding</p>
            </div>

            <div className="grid-3">
                {practiceQuizzes.map((quiz, i) => (
                    <div
                        key={quiz.id}
                        className="glass-card"
                        style={{ cursor: 'pointer', animationDelay: `${i * 0.05}s` }}
                        onClick={() => startQuiz(quiz)}
                    >
                        <div style={{ marginBottom: 16 }}>
                            {quizIcons[quiz.id] || <FileText size={40} />}
                        </div>

                        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
                            {quiz.title}
                        </h3>

                        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
                            {quiz.subject}
                        </p>

                        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <FileText size={12} /> 10 Questions
                            </span>
                            <span className={`badge badge-${quiz.difficulty.toLowerCase()}`}>
                                {quiz.difficulty}
                            </span>
                        </div>

                        <button className="btn btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
                            <Play size={14} /> Start Quiz
                        </button>
                    </div>
                ))}
            </div>
        </div>
    )
}
