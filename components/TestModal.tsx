
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, AlertCircle, Beaker } from 'lucide-react';
import { TestResult } from '../services/testRunner';

interface TestModalProps {
  isOpen: boolean;
  onClose: () => void;
  results: TestResult[];
}

const TestModal: React.FC<TestModalProps> = ({ isOpen, onClose, results }) => {
  const passCount = results.filter(r => r.passed).length;
  const score = Math.round((passCount / results.length) * 100);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="bg-indigo-600 p-6 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <Beaker size={28} className="text-indigo-200" />
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest opacity-80 leading-tight">System Regression</h3>
                  <p className="text-2xl font-bold">Suite Results</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-indigo-700 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between mb-6 bg-stone-50 p-4 rounded-2xl border border-stone-100">
                <div>
                  <p className="text-xs font-black text-stone-400 uppercase tracking-wider">Logic Health</p>
                  <p className="text-3xl font-black text-stone-800">{score}%</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-stone-400 uppercase tracking-wider">Status</p>
                  <p className={`text-sm font-bold ${score === 100 ? 'text-green-600' : 'text-amber-600'}`}>
                    {score === 100 ? 'ALL SYSTEMS GO' : 'CHECK FAILURES'}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {results.map((result, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    key={idx} 
                    className="flex gap-4 p-4 bg-white border border-stone-100 rounded-xl shadow-sm hover:border-indigo-100 transition-colors"
                  >
                    {result.passed ? (
                      <CheckCircle2 className="text-green-500 shrink-0" size={20} />
                    ) : (
                      <AlertCircle className="text-red-500 shrink-0" size={20} />
                    )}
                    <div>
                      <p className="text-sm font-bold text-stone-800 leading-tight mb-1">{result.name}</p>
                      <p className="text-xs text-stone-500 mb-2">{result.message}</p>
                      {!result.passed && (
                        <div className="bg-red-50 p-2 rounded text-[10px] font-mono text-red-700">
                          Expected: {JSON.stringify(result.expected)} <br />
                          Actual: {JSON.stringify(result.actual)}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>

              <button 
                onClick={onClose}
                className="w-full mt-6 bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-700 transition-all active:scale-95 shadow-xl shadow-indigo-200"
              >
                Close Report
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default TestModal;
