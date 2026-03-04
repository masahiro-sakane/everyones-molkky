type DisqualificationAlertProps = {
  teamName: string
  onDismiss?: () => void
}

export function DisqualificationAlert({ teamName, onDismiss }: DisqualificationAlertProps) {
  return (
    <div
      role="alert"
      className="flex items-start justify-between gap-3 px-4 py-3 bg-danger-50 border border-danger-300 rounded-lg"
    >
      <div className="flex items-start gap-2">
        <svg
          className="w-5 h-5 text-danger-500 shrink-0 mt-0.5"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
            clipRule="evenodd"
          />
        </svg>
        <div>
          <p className="text-sm font-semibold text-danger-700">失格</p>
          <p className="text-sm text-danger-600">
            <strong>{teamName}</strong> は3回連続ミスにより失格となりました。
          </p>
        </div>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="text-danger-500 hover:text-danger-700 transition-colors"
          aria-label="アラートを閉じる"
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
          </svg>
        </button>
      )}
    </div>
  )
}
