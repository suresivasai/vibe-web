// frontend/src/components/shared/ErrorBoundary.jsx
// Purpose: Catch React errors and show a friendly fallback
// Iteration: 7

import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || 'Something went wrong' }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-dvh flex flex-col items-center justify-center px-6 text-center">
          <p className="text-4xl mb-3">😵</p>
          <h1 className="text-xl font-bold mb-2">Oops — something broke</h1>
          <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mb-6 max-w-sm">
            {this.state.message}
          </p>
          <button
            type="button"
            onClick={() => {
              this.setState({ hasError: false, message: '' })
              window.location.href = '/'
            }}
            className="min-h-touch px-6 rounded-control bg-primary text-white font-semibold"
          >
            Go home
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
