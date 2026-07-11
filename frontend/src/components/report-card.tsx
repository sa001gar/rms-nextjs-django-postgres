import React from 'react';

interface ReportCardProps {
  studentName?: string;
  rollNo?: string;
  regNo?: string;
}

export function ReportCard({ studentName = 'Student Name', rollNo = '1', regNo = 'REG-123' }: ReportCardProps) {
  return (
    <div className="mx-auto w-full max-w-[210mm] bg-white p-8 text-black border-2 border-gray-800" style={{ minHeight: '297mm' }}>
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold uppercase mb-1">ST. XAVIER'S HIGH SCHOOL</h1>
        <p className="text-sm">Sector-20, XYZ City</p>
        <p className="text-sm font-semibold mt-2">REPORT CARD</p>
        <p className="text-sm font-semibold">ACADEMIC SESSION 2026-2027</p>
      </div>

      {/* Student Details */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-6 text-sm border border-black p-4">
        <div className="flex"><span className="font-semibold w-32">Registration No.</span><span>: {regNo}</span></div>
        <div className="flex"><span className="font-semibold w-32">Class / Section</span><span>: VI / A</span></div>
        <div className="flex"><span className="font-semibold w-32">Name</span><span>: {studentName}</span></div>
        <div className="flex"><span className="font-semibold w-32">Roll No.</span><span>: {rollNo}</span></div>
        <div className="flex"><span className="font-semibold w-32">Father's Name</span><span>: Father Name</span></div>
        <div className="flex"><span className="font-semibold w-32">Date of Birth</span><span>: 01/01/2015</span></div>
        <div className="flex"><span className="font-semibold w-32">Mother's Name</span><span>: Mother Name</span></div>
        <div className="flex"><span className="font-semibold w-32">Attendance</span><span>: 180/200</span></div>
      </div>

      {/* Marks Table */}
      <table className="w-full text-sm border-collapse border border-black mb-6 text-center">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-black p-1 text-left w-1/4" rowSpan={2}>Scholastic Areas</th>
            <th className="border border-black p-1" colSpan={4}>First Term</th>
            <th className="border border-black p-1" colSpan={4}>Second Term</th>
            <th className="border border-black p-1 w-20" rowSpan={2}>Final<br/>Result</th>
          </tr>
          <tr className="bg-gray-50">
            <th className="border border-black p-1 w-10">MTT1<br/>(20)</th>
            <th className="border border-black p-1 w-12">Term 1<br/>(80)</th>
            <th className="border border-black p-1 w-12">Total<br/>(100)</th>
            <th className="border border-black p-1 w-10">Grade</th>
            <th className="border border-black p-1 w-10">MTT2<br/>(20)</th>
            <th className="border border-black p-1 w-12">Term 2<br/>(80)</th>
            <th className="border border-black p-1 w-12">Total<br/>(100)</th>
            <th className="border border-black p-1 w-10">Grade</th>
          </tr>
        </thead>
        <tbody>
          {/* Mock Subjects */}
          {[
            { name: 'English', m1: 18, t1: 76, m2: 19, t2: 70 },
            { name: 'Hindi', m1: 15, t1: 60, m2: 18, t2: 65 },
            { name: 'Mathematics', m1: 20, t1: 80, m2: 20, t2: 78 },
            { name: 'Science', m1: 19, t1: 75, m2: 17, t2: 72 },
            { name: 'Social Studies', m1: 16, t1: 68, m2: 18, t2: 74 },
          ].map((s) => (
            <tr key={s.name}>
              <td className="border border-black p-1 text-left font-medium">{s.name}</td>
              <td className="border border-black p-1">{s.m1}</td>
              <td className="border border-black p-1">{s.t1}</td>
              <td className="border border-black p-1 font-semibold">{s.m1 + s.t1}</td>
              <td className="border border-black p-1">A</td>
              <td className="border border-black p-1">{s.m2}</td>
              <td className="border border-black p-1">{s.t2}</td>
              <td className="border border-black p-1 font-semibold">{s.m2 + s.t2}</td>
              <td className="border border-black p-1">A</td>
              <td className="border border-black p-1 font-semibold bg-gray-50">{s.m1 + s.t1 + s.m2 + s.t2}</td>
            </tr>
          ))}
          {/* Grand Total */}
          <tr className="font-bold bg-gray-100">
            <td className="border border-black p-1 text-left">Grand Total</td>
            <td className="border border-black p-1" colSpan={3}>407 / 500</td>
            <td className="border border-black p-1"></td>
            <td className="border border-black p-1" colSpan={3}>411 / 500</td>
            <td className="border border-black p-1"></td>
            <td className="border border-black p-1">818</td>
          </tr>
          {/* Percentage */}
          <tr className="font-bold">
            <td className="border border-black p-1 text-left">Percentage</td>
            <td className="border border-black p-1" colSpan={4}>81.4%</td>
            <td className="border border-black p-1" colSpan={4}>82.2%</td>
            <td className="border border-black p-1">81.8%</td>
          </tr>
        </tbody>
      </table>

      {/* Co-Scholastic & Remarks */}
      <div className="grid grid-cols-2 gap-6 mb-8 text-sm">
        <div>
          <table className="w-full border-collapse border border-black text-center mb-4">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black p-1 text-left">Co-Scholastic Areas</th>
                <th className="border border-black p-1 w-16">Grade</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black p-1 text-left">Work Education</td>
                <td className="border border-black p-1 font-semibold">A</td>
              </tr>
              <tr>
                <td className="border border-black p-1 text-left">Art Education</td>
                <td className="border border-black p-1 font-semibold">A</td>
              </tr>
              <tr>
                <td className="border border-black p-1 text-left">Health & Physical Education</td>
                <td className="border border-black p-1 font-semibold">B</td>
              </tr>
              <tr>
                <td className="border border-black p-1 text-left">Discipline</td>
                <td className="border border-black p-1 font-semibold">A</td>
              </tr>
            </tbody>
          </table>
          <div className="border border-black p-2 min-h-[60px]">
            <p className="font-semibold mb-1">Remarks :</p>
            <p>Excellent performance. Keep it up!</p>
          </div>
        </div>
        
        {/* Grading Scale */}
        <div>
          <table className="w-full border-collapse border border-black text-center text-xs">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black p-1" colSpan={2}>Grading Scale (Scholastic)</th>
              </tr>
              <tr className="bg-gray-50">
                <th className="border border-black p-1">Marks Range</th>
                <th className="border border-black p-1">Grade</th>
              </tr>
            </thead>
            <tbody>
              <tr><td className="border border-black p-1">91-100</td><td className="border border-black p-1">A1</td></tr>
              <tr><td className="border border-black p-1">81-90</td><td className="border border-black p-1">A2</td></tr>
              <tr><td className="border border-black p-1">71-80</td><td className="border border-black p-1">B1</td></tr>
              <tr><td className="border border-black p-1">61-70</td><td className="border border-black p-1">B2</td></tr>
              <tr><td className="border border-black p-1">51-60</td><td className="border border-black p-1">C1</td></tr>
              <tr><td className="border border-black p-1">41-50</td><td className="border border-black p-1">C2</td></tr>
              <tr><td className="border border-black p-1">33-40</td><td className="border border-black p-1">D</td></tr>
              <tr><td className="border border-black p-1">32 & Below</td><td className="border border-black p-1">E (Needs Improvement)</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer / Signatures */}
      <div className="flex justify-between items-end mt-16 pt-8 border-t border-gray-300 text-sm font-semibold">
        <div className="text-center w-32 border-t border-black pt-1">Date</div>
        <div className="text-center w-32 border-t border-black pt-1">Class Teacher</div>
        <div className="text-center w-32 border-t border-black pt-1">Principal</div>
        <div className="text-center w-32 border-t border-black pt-1">Parent's Signature</div>
      </div>
    </div>
  );
}
