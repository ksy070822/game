import { useState, useRef } from 'react';
import { parseVetDocument, imageToBase64, convertToMedicalRecord, saveMedicalRecord, OCR_DOCUMENT_TYPES } from '../services/ai/ocrService';

/**
 * OCR 문서 업로드 및 구조화 컴포넌트
 */
export function OCRUpload({ petData, onBack, onSaveRecord }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [documentType, setDocumentType] = useState('auto');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editedData, setEditedData] = useState(null);
  const fileInputRef = useRef(null);

  // 파일 선택 핸들러
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 파일 타입 체크
    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 업로드 가능합니다.');
      return;
    }

    // 파일 크기 체크 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('파일 크기는 10MB 이하여야 합니다.');
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setResult(null);
    setError(null);
    setEditMode(false);
  };

  // OCR 처리
  const handleProcess = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setError(null);

    try {
      const base64 = await imageToBase64(selectedFile);
      const mimeType = selectedFile.type;
      const ocrResult = await parseVetDocument(base64, documentType, mimeType);

      if (ocrResult.success) {
        setResult(ocrResult);
        setEditedData(ocrResult.data);
      } else {
        setError(ocrResult.error || 'OCR 처리에 실패했습니다.');
      }
    } catch (err) {
      setError('처리 중 오류가 발생했습니다: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // 의료 기록으로 저장
  const handleSave = () => {
    if (!editedData || !petData) return;

    const record = convertToMedicalRecord(editedData, petData.id);
    const saved = saveMedicalRecord(record);

    if (saved) {
      if (onSaveRecord) {
        onSaveRecord(record);
      }
      // 성공 모달 또는 알림
      alert('의료 기록이 저장되었습니다.');
      // 초기화
      setSelectedFile(null);
      setPreviewUrl(null);
      setResult(null);
      setEditedData(null);
      setEditMode(false);
    } else {
      setError('저장에 실패했습니다.');
    }
  };

  // 드래그앤드롭 핸들러
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const fakeEvent = { target: { files: [file] } };
      handleFileSelect(fakeEvent);
    }
  };

  // 필드 편집 핸들러
  const handleFieldEdit = (path, value) => {
    setEditedData(prev => {
      const newData = JSON.parse(JSON.stringify(prev));
      const keys = path.split('.');
      let current = newData;
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return newData;
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white pb-24">
      {/* 헤더 */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={onBack}
            className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-full transition"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="text-lg font-bold text-slate-800">문서 스캔</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* 펫 정보 */}
        {petData && (
          <div className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-sky-100 flex items-center justify-center text-2xl">
              {petData.species === 'dog' ? '🐕' : petData.species === 'cat' ? '🐈' : '🐾'}
            </div>
            <div>
              <div className="font-semibold text-slate-800">{petData.petName || petData.name}</div>
              <div className="text-sm text-slate-500">{petData.breed || '품종 미입력'}</div>
            </div>
          </div>
        )}

        {/* 문서 타입 선택 */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <label className="block text-sm font-medium text-slate-700 mb-2">문서 종류</label>
          <select
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
          >
            <option value="auto">자동 감지</option>
            <option value="receipt">진료비 영수증</option>
            <option value="prescription">처방전</option>
            <option value="diagnosis">진단서</option>
            <option value="vaccination">예방접종 증명서</option>
            <option value="test_result">검사 결과지</option>
          </select>
        </div>

        {/* 파일 업로드 영역 */}
        <div
          className={`bg-white rounded-xl p-6 shadow-sm border-2 border-dashed transition-colors ${
            selectedFile ? 'border-sky-400 bg-sky-50/50' : 'border-slate-200 hover:border-sky-300'
          }`}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {previewUrl ? (
            <div className="space-y-4">
              <img
                src={previewUrl}
                alt="미리보기"
                className="max-h-64 mx-auto rounded-lg shadow-md"
              />
              <p className="text-center text-sm text-slate-500">
                {selectedFile?.name}
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFile(null);
                  setPreviewUrl(null);
                  setResult(null);
                }}
                className="mx-auto block text-sm text-red-500 hover:text-red-600"
              >
                이미지 삭제
              </button>
            </div>
          ) : (
            <div className="text-center py-8">
              <span className="material-symbols-outlined text-5xl text-sky-400 mb-3 block">
                document_scanner
              </span>
              <p className="text-slate-600 font-medium">문서 이미지를 업로드하세요</p>
              <p className="text-sm text-slate-400 mt-1">
                클릭하거나 드래그하여 파일 선택
              </p>
              <p className="text-xs text-slate-400 mt-2">
                지원 형식: JPG, PNG, HEIC (최대 10MB)
              </p>
            </div>
          )}
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <span className="material-symbols-outlined text-red-500">error</span>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* 처리 버튼 */}
        {selectedFile && !result && (
          <button
            onClick={handleProcess}
            disabled={isProcessing}
            className="w-full py-4 bg-gradient-to-r from-sky-500 to-sky-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                AI가 문서를 분석 중입니다...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">auto_awesome</span>
                AI로 문서 분석하기
              </>
            )}
          </button>
        )}

        {/* 결과 표시 */}
        {result && editedData && (
          <div className="space-y-4">
            {/* 결과 헤더 */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-slate-800 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sky-500">check_circle</span>
                  분석 완료
                </h2>
                <button
                  onClick={() => setEditMode(!editMode)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                    editMode
                      ? 'bg-sky-500 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {editMode ? '편집 완료' : '수정하기'}
                </button>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span className="material-symbols-outlined text-sm">description</span>
                {getDocumentTypeLabel(editedData.documentType)}
                {result.isDummy && (
                  <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs">
                    더미 데이터
                  </span>
                )}
              </div>
            </div>

            {/* 구조화된 데이터 표시 */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <ResultView
                data={editedData}
                editMode={editMode}
                onEdit={handleFieldEdit}
              />
            </div>

            {/* 저장 버튼 */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setResult(null);
                  setEditedData(null);
                }}
                className="flex-1 py-3 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition"
              >
                다시 분석
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-3 bg-gradient-to-r from-sky-500 to-sky-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">save</span>
                기록 저장
              </button>
            </div>
          </div>
        )}

        {/* 안내 텍스트 */}
        <div className="bg-sky-50 rounded-xl p-4 mt-4">
          <h3 className="font-medium text-sky-800 flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-sm">info</span>
            사용 가이드
          </h3>
          <ul className="text-sm text-sky-700 space-y-1">
            <li>• 진료비 영수증, 처방전, 진단서 등을 촬영하세요</li>
            <li>• 문서가 잘 보이도록 밝은 곳에서 촬영해주세요</li>
            <li>• AI가 자동으로 내용을 인식하고 구조화합니다</li>
            <li>• 인식 결과를 확인하고 필요시 수정하세요</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// 문서 타입 라벨
function getDocumentTypeLabel(type) {
  const labels = {
    receipt: '진료비 영수증',
    prescription: '처방전',
    diagnosis: '진단서',
    vaccination: '예방접종 증명서',
    test_result: '검사 결과지',
  };
  return labels[type] || '기타 문서';
}

// 결과 뷰어 컴포넌트
function ResultView({ data, editMode, onEdit }) {
  if (!data) return null;

  return (
    <div className="divide-y divide-slate-100">
      {/* 병원 정보 */}
      {data.hospital && (
        <ResultSection title="병원 정보" icon="local_hospital">
          <ResultField
            label="병원명"
            value={data.hospital.name}
            editMode={editMode}
            onEdit={(v) => onEdit('hospital.name', v)}
          />
          {data.hospital.address && (
            <ResultField
              label="주소"
              value={data.hospital.address}
              editMode={editMode}
              onEdit={(v) => onEdit('hospital.address', v)}
            />
          )}
          {data.hospital.phone && (
            <ResultField
              label="전화번호"
              value={data.hospital.phone}
              editMode={editMode}
              onEdit={(v) => onEdit('hospital.phone', v)}
            />
          )}
          {data.hospital.vetName && (
            <ResultField
              label="수의사"
              value={data.hospital.vetName}
              editMode={editMode}
              onEdit={(v) => onEdit('hospital.vetName', v)}
            />
          )}
        </ResultSection>
      )}

      {/* 환자 정보 */}
      {data.patient && (
        <ResultSection title="환자 정보" icon="pets">
          <ResultField
            label="이름"
            value={data.patient.petName}
            editMode={editMode}
            onEdit={(v) => onEdit('patient.petName', v)}
          />
          {data.patient.species && (
            <ResultField
              label="종류"
              value={data.patient.species}
              editMode={editMode}
              onEdit={(v) => onEdit('patient.species', v)}
            />
          )}
          {data.patient.breed && (
            <ResultField
              label="품종"
              value={data.patient.breed}
              editMode={editMode}
              onEdit={(v) => onEdit('patient.breed', v)}
            />
          )}
          {data.patient.ownerName && (
            <ResultField
              label="보호자"
              value={data.patient.ownerName}
              editMode={editMode}
              onEdit={(v) => onEdit('patient.ownerName', v)}
            />
          )}
        </ResultSection>
      )}

      {/* 영수증 항목 */}
      {data.items && data.items.length > 0 && (
        <ResultSection title="진료 항목" icon="receipt_long">
          <div className="space-y-2">
            {data.items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center py-2 px-1 bg-slate-50 rounded-lg">
                <div>
                  <span className="text-xs text-slate-500">{item.category}</span>
                  <p className="text-sm font-medium text-slate-700">{item.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-800">
                    {item.amount?.toLocaleString()}원
                  </p>
                  {item.quantity > 1 && (
                    <span className="text-xs text-slate-500">{item.quantity}개</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          {data.summary && (
            <div className="mt-3 pt-3 border-t border-slate-200">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">총 금액</span>
                <span className="font-bold text-sky-600">
                  {data.summary.total?.toLocaleString()}원
                </span>
              </div>
            </div>
          )}
        </ResultSection>
      )}

      {/* 처방약 */}
      {data.medications && data.medications.length > 0 && (
        <ResultSection title="처방 약품" icon="medication">
          <div className="space-y-3">
            {data.medications.map((med, idx) => (
              <div key={idx} className="p-3 bg-slate-50 rounded-lg">
                <p className="font-medium text-slate-800">{med.name}</p>
                <div className="mt-1 text-sm text-slate-600 space-y-0.5">
                  <p>용량: {med.dosage}</p>
                  <p>복용: {med.frequency}, {med.duration}</p>
                  {med.instructions && <p>방법: {med.instructions}</p>}
                  {med.warnings && (
                    <p className="text-amber-600">⚠️ {med.warnings}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ResultSection>
      )}

      {/* 진단 */}
      {data.diagnosis && (
        <ResultSection title="진단" icon="medical_information">
          {typeof data.diagnosis === 'string' ? (
            <ResultField
              label="진단명"
              value={data.diagnosis}
              editMode={editMode}
              onEdit={(v) => onEdit('diagnosis', v)}
            />
          ) : (
            <>
              <ResultField
                label="주진단"
                value={data.diagnosis.primary}
                editMode={editMode}
                onEdit={(v) => onEdit('diagnosis.primary', v)}
              />
              {data.diagnosis.secondary && data.diagnosis.secondary.length > 0 && (
                <div className="mt-2">
                  <span className="text-xs text-slate-500">부진단</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {data.diagnosis.secondary.map((d, i) => (
                      <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-sm rounded">
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </ResultSection>
      )}

      {/* 검사 결과 */}
      {data.results && data.results.length > 0 && (
        <ResultSection title="검사 결과" icon="biotech">
          <div className="space-y-2">
            {data.results.map((result, idx) => (
              <div key={idx} className="flex justify-between items-center py-2 px-1">
                <span className="text-sm text-slate-600">{result.item}</span>
                <div className="text-right">
                  <span className={`text-sm font-medium ${
                    result.status === '높음' ? 'text-red-600' :
                    result.status === '낮음' ? 'text-blue-600' :
                    'text-green-600'
                  }`}>
                    {result.value} {result.unit}
                  </span>
                  {result.normalRange && (
                    <p className="text-xs text-slate-400">정상: {result.normalRange}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ResultSection>
      )}

      {/* 예방접종 */}
      {data.vaccinations && data.vaccinations.length > 0 && (
        <ResultSection title="예방접종 기록" icon="vaccines">
          <div className="space-y-3">
            {data.vaccinations.map((vac, idx) => (
              <div key={idx} className="p-3 bg-slate-50 rounded-lg">
                <p className="font-medium text-slate-800">{vac.vaccineName}</p>
                <div className="mt-1 text-sm text-slate-600 space-y-0.5">
                  <p>접종일: {vac.administrationDate}</p>
                  {vac.nextDueDate && <p>다음 접종: {vac.nextDueDate}</p>}
                  {vac.manufacturer && <p>제조사: {vac.manufacturer}</p>}
                </div>
              </div>
            ))}
          </div>
        </ResultSection>
      )}

      {/* 날짜 정보 */}
      {(data.visitDate || data.prescriptionDate || data.testDate || data.issuedDate) && (
        <ResultSection title="일자" icon="event">
          <ResultField
            label="일자"
            value={data.visitDate || data.prescriptionDate || data.testDate || data.issuedDate}
            editMode={editMode}
            onEdit={(v) => onEdit(
              data.visitDate ? 'visitDate' :
              data.prescriptionDate ? 'prescriptionDate' :
              data.testDate ? 'testDate' : 'issuedDate', v
            )}
          />
        </ResultSection>
      )}

      {/* 비고 */}
      {(data.notes || data.interpretation || data.prognosis) && (
        <ResultSection title="비고" icon="notes">
          {data.notes && (
            <ResultField
              label="메모"
              value={data.notes}
              editMode={editMode}
              onEdit={(v) => onEdit('notes', v)}
            />
          )}
          {data.interpretation && (
            <ResultField
              label="소견"
              value={data.interpretation}
              editMode={editMode}
              onEdit={(v) => onEdit('interpretation', v)}
            />
          )}
          {data.prognosis && (
            <ResultField
              label="예후"
              value={data.prognosis}
              editMode={editMode}
              onEdit={(v) => onEdit('prognosis', v)}
            />
          )}
        </ResultSection>
      )}
    </div>
  );
}

// 섹션 컴포넌트
function ResultSection({ title, icon, children }) {
  return (
    <div className="p-4">
      <h3 className="font-semibold text-slate-700 flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined text-sky-500 text-lg">{icon}</span>
        {title}
      </h3>
      {children}
    </div>
  );
}

// 필드 컴포넌트
function ResultField({ label, value, editMode, onEdit }) {
  if (!value) return null;

  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-slate-500">{label}</span>
      {editMode ? (
        <input
          type="text"
          value={value}
          onChange={(e) => onEdit(e.target.value)}
          className="text-sm text-right bg-white border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-sky-400 max-w-[60%]"
        />
      ) : (
        <span className="text-sm font-medium text-slate-800">{value}</span>
      )}
    </div>
  );
}

export default OCRUpload;
