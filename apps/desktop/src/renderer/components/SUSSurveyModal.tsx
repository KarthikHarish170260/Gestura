import React, { useState } from 'react';
import { X, CheckCircle, Award } from 'lucide-react';

interface SUSSurveyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SUS_QUESTIONS = [
  "I think that I would like to use this system frequently.",
  "I found the system unnecessarily complex.",
  "I thought the system was easy to use.",
  "I think that I would need the support of a technical person to be able to use this system.",
  "I found the various functions in this system were well integrated.",
  "I thought there was too much inconsistency in this system.",
  "I would imagine that most people would learn to use this system very quickly.",
  "I found the system very cumbersome to use.",
  "I felt very confident using the system.",
  "I needed to learn a lot of things before I could get going with this system.",
];

export const SUSSurveyModal: React.FC<SUSSurveyModalProps> = ({ isOpen, onClose }) => {
  const [answers, setAnswers] = useState<number[]>(Array(10).fill(3));
  const [result, setResult] = useState<{ score: number; grade: string; adjective: string } | null>(null);

  if (!isOpen) return null;

  const handleScoreChange = (qIndex: number, val: number) => {
    const updated = [...answers];
    updated[qIndex] = val;
    setAnswers(updated);
  };

  const handleSubmit = async () => {
    try {
      const resp = await fetch('http://127.0.0.1:8000/settings/sus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Gestura-Token': 'dev-token' },
        body: JSON.stringify({ answers }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data);
        return;
      }
    } catch {
      // Fallback client-side calculation
    }

    // Standard client-side formula fallback
    const oddSum = answers.filter((_, idx) => idx % 2 === 0).reduce((acc, v) => acc + (v - 1), 0);
    const evenSum = answers.filter((_, idx) => idx % 2 === 1).reduce((acc, v) => acc + (5 - v), 0);
    const score = (oddSum + evenSum) * 2.5;
    const grade = score >= 80 ? 'A' : score >= 70 ? 'B' : 'C';
    const adjective = score >= 85 ? 'Excellent' : score >= 70 ? 'Good' : 'Marginal';
    setResult({ score, grade, adjective });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="flex flex-col w-full max-w-2xl max-h-[90vh] rounded-xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div>
            <h3 className="text-base font-bold text-slate-100">System Usability Scale (SUS) Assessment</h3>
            <p className="text-xs text-slate-400">10-item standard usability questionnaire (Brooke, 1996)</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {result ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-4 text-center">
              <div className="h-16 w-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Award className="h-8 w-8" />
              </div>
              <div>
                <div className="text-xs uppercase font-bold text-slate-400">Your Calculated SUS Score</div>
                <div className="text-5xl font-black text-emerald-400 mt-1">{result.score} / 100</div>
                <div className="text-sm font-semibold text-slate-300 mt-2">
                  Grade: <span className="text-indigo-400">{result.grade}</span> ({result.adjective})
                </div>
              </div>
              <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                Scores above 68 are considered above average. Scores above 80 indicate high satisfaction and accessibility.
              </p>
              <button
                type="button"
                onClick={() => setResult(null)}
                className="mt-4 rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700"
              >
                Re-take Questionnaire
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {SUS_QUESTIONS.map((question, qIdx) => (
                <div key={qIdx} className="space-y-2 p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                  <div className="text-xs font-medium text-slate-200">
                    <span className="font-bold text-indigo-400 mr-2">{qIdx + 1}.</span>
                    {question}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-slate-500">Strongly Disagree</span>
                    <div className="flex gap-4">
                      {[1, 2, 3, 4, 5].map((val) => (
                        <label key={val} className="flex flex-col items-center gap-1 cursor-pointer">
                          <input
                            type="radio"
                            name={`sus-q-${qIdx}`}
                            value={val}
                            checked={answers[qIdx] === val}
                            onChange={() => handleScoreChange(qIdx, val)}
                            className="text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                          <span className="text-[10px] text-slate-400">{val}</span>
                        </label>
                      ))}
                    </div>
                    <span className="text-[10px] text-slate-500">Strongly Agree</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-slate-800 px-6 py-3 bg-slate-900/80">
          {!result && (
            <button
              type="button"
              onClick={handleSubmit}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20"
            >
              <CheckCircle className="h-4 w-4" /> Calculate SUS Score
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
