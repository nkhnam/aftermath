"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, ChevronRight } from "lucide-react";
import type { FinancialScenario, CustomScenarioForm as FormState, ValidationError } from "@/lib/types";
import { getDefaultForm, personas, formToScenario } from "@/lib/scenarios";
import { getScenarioMetrics, totalHousingBurden } from "@/lib/financial-engine";
import { formatCurrencyShort, formatDecimal, formatMonthsDuration } from "@/lib/formatters";
import { useT } from "@/lib/i18n";

interface CustomScenarioFormProps {
  onBack: () => void;
  onAnalyze: (scenario: FinancialScenario) => void;
}

const SECTIONS = [
  "decision",
  "loanTerms",
  "cashflow",
  "safetyBuffer",
  "stressTest",
] as const;
const FORM_STORAGE_KEY = "aftermath.custom-scenario.v1";

export function CustomScenarioForm({ onBack, onAnalyze }: CustomScenarioFormProps) {
  const { t, lang } = useT();
  const [form, setForm] = useState<FormState>(getDefaultForm());
  const [step, setStep] = useState(0);
  const [loanManual, setLoanManual] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(FORM_STORAGE_KEY);
    } catch {
      // Invalid or unavailable browser storage does not block the form.
    }
    if (!saved) return;
    const timer = window.setTimeout(() => {
      try {
        setForm({ ...getDefaultForm(), ...JSON.parse(saved) });
      } catch {
        localStorage.removeItem(FORM_STORAGE_KEY);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  // Auto-calculate loan amount from price - down payment
  const effectiveForm = useMemo(() => {
    if (loanManual) return form;
    return { ...form, loanAmount: Math.max(0, form.propertyPrice - form.downPayment) };
  }, [form, loanManual]);

  useEffect(() => {
    try {
      localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(effectiveForm));
    } catch {
      // Persistence is optional; calculations remain local and functional.
    }
  }, [effectiveForm]);

  // Validation
  const errors = useMemo(() => validateForm(effectiveForm), [effectiveForm]);
  const errorMap = useMemo(() => {
    const map: Record<string, ValidationError> = {};
    for (const e of errors) map[e.field] = e;
    return map;
  }, [errors]);

  const getFieldError = useCallback(
    (field: string): string | null => {
      if (!touched[field]) return null;
      const err = errorMap[field];
      if (!err) return null;
      return t(`validation.${err.errorType}`, err.values);
    },
    [touched, errorMap, t],
  );

  const updateField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setTouched((prev) => ({ ...prev, [key]: true }));
  }, []);

  const handlePersonaSelect = useCallback((personaId: string) => {
    const persona = personas.find((p) => p.id === personaId);
    if (persona) {
      setForm((prev) => ({ ...prev, ...persona.formValues } as FormState));
    }
  }, []);

  const canProceed = useMemo(() => {
    const sectionFields = getSectionFields(SECTIONS[step]);
    return sectionFields.every((field) => !errorMap[field]);
  }, [step, errorMap]);

  const handleNext = useCallback(() => {
    // Touch all fields in current section
    const sectionFields = getSectionFields(SECTIONS[step]);
    setTouched((prev) => {
      const next = { ...prev };
      for (const f of sectionFields) next[f] = true;
      return next;
    });
    if (canProceed && step < SECTIONS.length - 1) {
      setStep((s) => s + 1);
    }
  }, [step, canProceed]);

  const handlePrevious = useCallback(() => {
    if (step > 0) setStep((s) => s - 1);
  }, [step]);

  const handleReveal = useCallback(() => {
    // Touch all fields
    const allFields = SECTIONS.flatMap(getSectionFields);
    setTouched(() => {
      const next: Record<string, boolean> = {};
      for (const f of allFields) next[f] = true;
      return next;
    });
    if (errors.length === 0) {
      const scenario = formToScenario(effectiveForm);
      onAnalyze(scenario);
    }
  }, [errors, effectiveForm, onAnalyze]);

  // Live preview metrics
  const preview = useMemo(() => computePreview(effectiveForm), [effectiveForm]);

  const isLastStep = step === SECTIONS.length - 1;
  const sectionKey = SECTIONS[step];

  return (
    <div className="mx-auto max-w-5xl px-6 py-8 lg:py-12">
      {/* Header */}
      <div className="mb-8 flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 text-xs transition-colors hover:border-[var(--border-strong)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t("custom.back")}
        </button>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] lg:text-3xl">
          {t("custom.title")}
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          {t("custom.subtitle")}
        </p>
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem(FORM_STORAGE_KEY);
              setForm(getDefaultForm());
              setTouched({});
              setStep(0);
              setLoanManual(false);
            }}
            className="text-xs text-[var(--accent-red)] hover:underline"
          >
            {t("custom.clearScenario")}
          </button>
          <span className="text-[10px] text-[var(--text-muted)]">{t("custom.localOnly")}</span>
        </div>
      </div>

      {/* Persona selector */}
      <div className="mb-8">
        <p className="mb-1 text-sm font-semibold text-[var(--text-secondary)]">
          {t("persona.title")}
        </p>
        <p className="mb-3 text-xs text-[var(--text-muted)]">
          {t("persona.hint")}
        </p>
        <div className="flex flex-wrap gap-3">
          {personas.map((persona) => (
            <button
              key={persona.id}
              onClick={() => handlePersonaSelect(persona.id)}
              className="flex w-56 flex-col rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3 text-left transition-colors hover:border-[var(--accent-blue)]/50"
            >
              <span className="text-sm font-semibold text-[var(--text-primary)]">
                {t(`persona.${persona.id}.name`)}
              </span>
              <span className="mt-0.5 text-xs text-[var(--text-muted)]">
                {t(`persona.${persona.id}.purpose`)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Two-column layout: form + preview */}
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Form */}
        <div className="flex-1">
          {/* Step indicator */}
          <div className="mb-6 flex items-center gap-2">
            {SECTIONS.map((s, i) => (
              <button
                key={s}
                onClick={() => setStep(i)}
                className="flex items-center gap-1"
              >
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold transition-colors ${
                    i === step
                      ? "bg-[var(--accent-amber)] text-[var(--bg-base)]"
                      : i < step
                        ? "bg-[var(--accent-green)]/30 text-[var(--accent-green)]"
                        : "bg-[var(--bg-elevated)] text-[var(--text-muted)]"
                  }`}
                >
                  {i < step ? "✓" : i + 1}
                </div>
                {i < SECTIONS.length - 1 && (
                  <ChevronRight className="h-3 w-3 text-[var(--text-muted)]" />
                )}
              </button>
            ))}
          </div>

          {/* Section title */}
          <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
            {t(`form.section.${sectionKey}`)}
          </h2>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {sectionKey === "decision" && (
                <DecisionSection
                  form={effectiveForm}
                  updateField={updateField}
                  loanManual={loanManual}
                  setLoanManual={setLoanManual}
                  getFieldError={getFieldError}
                  t={t}
                  lang={lang}
                />
              )}
              {sectionKey === "loanTerms" && (
                <LoanTermsSection
                  form={effectiveForm}
                  updateField={updateField}
                  getFieldError={getFieldError}
                  t={t}
                  lang={lang}
                />
              )}
              {sectionKey === "cashflow" && (
                <CashflowSection
                  form={effectiveForm}
                  updateField={updateField}
                  getFieldError={getFieldError}
                  t={t}
                  lang={lang}
                />
              )}
              {sectionKey === "safetyBuffer" && (
                <SafetyBufferSection
                  form={effectiveForm}
                  updateField={updateField}
                  getFieldError={getFieldError}
                  t={t}
                  lang={lang}
                />
              )}
              {sectionKey === "stressTest" && (
                <StressTestSection
                  form={effectiveForm}
                  updateField={updateField}
                  getFieldError={getFieldError}
                  t={t}
                  lang={lang}
                />
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={handlePrevious}
              disabled={step === 0}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] px-4 py-2 text-xs transition-colors hover:border-[var(--border-strong)] disabled:opacity-40 disabled:hover:border-[var(--border-subtle)]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t("form.previous")}
            </button>

            {isLastStep ? (
              <button
                onClick={handleReveal}
                disabled={errors.length > 0}
                className="flex items-center gap-2 rounded-xl bg-[var(--accent-amber)] px-6 py-2.5 font-semibold text-[var(--bg-base)] transition-all hover:bg-[var(--accent-amber)]/90 hover:shadow-lg hover:shadow-[var(--accent-amber)]/20 disabled:opacity-40"
              >
                {t("custom.revealAftermath")}
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={!canProceed}
                className="flex items-center gap-1.5 rounded-lg bg-[var(--accent-amber)] px-4 py-2 text-xs font-semibold text-[var(--bg-base)] transition-all hover:bg-[var(--accent-amber)]/90 disabled:opacity-40"
              >
                {t("form.next")}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Disclaimer */}
          <p className="mt-6 text-[10px] text-[var(--text-muted)]">
            {t("custom.disclaimer")}
          </p>
        </div>

        {/* Live preview */}
        <div className="lg:w-72 lg:shrink-0">
          <div className="sticky top-20 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
            <p className="mb-1 text-sm font-semibold text-[var(--text-secondary)]">
              {t("custom.livePreview")}
            </p>
            <p className="mb-4 text-[10px] text-[var(--text-muted)]">
              {t("custom.previewHint")}
            </p>

            <div className="space-y-3">
              <PreviewItem
                label={t("preview.loanAmount")}
                value={formatCurrencyShort(effectiveForm.loanAmount, lang)}
              />
              <PreviewItem
                label={t("preview.introPayment")}
                value={formatCurrencyShort(preview.introPayment, lang)}
              />
              {!effectiveForm.isFixedRate && (
                <PreviewItem
                  label={t("preview.postResetPayment")}
                  value={formatCurrencyShort(preview.postResetPayment, lang)}
                />
              )}
              <PreviewItem
                label={t("preview.totalHousingBurden")}
                value={formatCurrencyShort(preview.totalHousing, lang)}
              />
              <PreviewItem
                label={t("preview.remainingCash")}
                value={formatCurrencyShort(preview.remainingCash, lang)}
                valueColor={preview.remainingCash < 0 ? "var(--accent-red)" : "var(--accent-green)"}
              />
              <PreviewItem
                label={t("preview.emergencyRunway")}
                value={formatMonthsDuration(Math.round(preview.emergencyRunway), lang)}
              />
              <PreviewItem
                label={t("preview.mortgageIncomeRatio")}
                value={`${formatDecimal(preview.mortgageIncomeRatio, lang, 0)}%`}
                valueColor={preview.mortgageIncomeRatio > 40 ? "var(--accent-red)" : "var(--text-secondary)"}
              />
              <PreviewItem
                label={t("preview.postMortgageIncomeRatio")}
                value={`${formatDecimal(preview.postMortgageIncomeRatio, lang, 0)}%`}
              />
              <PreviewItem
                label={t("preview.paymentIncrease")}
                value={`${formatDecimal(preview.paymentIncreasePct, lang, 0)}%`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Form sections
// ============================================================================

type UpdateField = <K extends keyof FormState>(key: K, value: FormState[K]) => void;
type GetFieldError = (field: string) => string | null;
type TFunc = (key: string, params?: Record<string, string | number>) => string;

function DecisionSection({
  form,
  updateField,
  loanManual,
  setLoanManual,
  getFieldError,
  t,
  lang,
}: {
  form: FormState;
  updateField: UpdateField;
  loanManual: boolean;
  setLoanManual: (v: boolean) => void;
  getFieldError: GetFieldError;
  t: TFunc;
  lang: "en" | "vi";
}) {
  return (
    <>
      <FormField label={t("form.scenarioName")} error={getFieldError("scenarioName")}>
        <input
          type="text"
          value={form.scenarioName}
          onChange={(e) => updateField("scenarioName", e.target.value)}
          placeholder={t("form.scenarioName.placeholder")}
          className="form-input"
        />
      </FormField>

      <FormField label={t("form.propertyPrice")} helper={t("form.propertyPrice.helper")} error={getFieldError("propertyPrice")}>
        <NumberInput
          value={form.propertyPrice}
          onChange={(v) => updateField("propertyPrice", v)}
          suffix="₫"
          lang={lang}
        />
      </FormField>

      <FormField label={t("form.downPayment")} helper={t("form.downPayment.helper")} error={getFieldError("downPayment")}>
        <NumberInput
          value={form.downPayment}
          onChange={(v) => updateField("downPayment", v)}
          suffix="₫"
          lang={lang}
        />
      </FormField>

      <FormField
        label={t("form.loanAmount")}
        helper={loanManual ? undefined : t("form.loanAmount.helper")}
        error={getFieldError("loanAmount")}
      >
        {loanManual ? (
          <NumberInput
            value={form.loanAmount}
            onChange={(v) => updateField("loanAmount", v)}
            suffix="₫"
            lang={lang}
          />
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-base)] px-3 py-2 text-sm tabular-nums text-[var(--text-muted)]">
              {formatCurrencyShort(form.loanAmount, lang)}
            </div>
            <button
              onClick={() => setLoanManual(true)}
              className="text-[10px] text-[var(--accent-blue)] hover:underline"
            >
              {t("form.loanAmount.manual")}
            </button>
          </div>
        )}
      </FormField>
    </>
  );
}

function LoanTermsSection({
  form,
  updateField,
  getFieldError,
  t,
  lang,
}: {
  form: FormState;
  updateField: UpdateField;
  getFieldError: GetFieldError;
  t: TFunc;
  lang: "en" | "vi";
}) {
  return (
    <>
      <FormField label={t("form.loanTermYears")} error={getFieldError("loanTermYears")}>
        <div className="flex items-center gap-2">
          <NumberInput
            value={form.loanTermYears}
            onChange={(v) => updateField("loanTermYears", v)}
            lang={lang}
          />
          <span className="text-xs text-[var(--text-muted)]">{t("form.years")}</span>
        </div>
      </FormField>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={form.isFixedRate}
          onChange={(e) => updateField("isFixedRate", e.target.checked)}
          className="h-4 w-4 rounded accent-[var(--accent-amber)]"
        />
        <div>
          <span className="text-sm font-medium text-[var(--text-secondary)]">
            {t("form.isFixedRate")}
          </span>
          <span className="block text-[10px] text-[var(--text-muted)]">
            {t("form.isFixedRate.helper")}
          </span>
        </div>
      </label>

      <FormField label={t("form.introductoryRate")} helper={t("form.introductoryRate.helper")} error={getFieldError("introductoryRate")}>
        <div className="flex items-center gap-2">
          <NumberInput
            value={form.introductoryRate}
            onChange={(v) => updateField("introductoryRate", v)}
            step={0.1}
            lang={lang}
          />
          <span className="text-xs text-[var(--text-muted)]">{t("form.percent")}</span>
        </div>
      </FormField>

      {!form.isFixedRate && (
        <>
          <FormField label={t("form.postIntroductoryRate")} helper={t("form.postIntroductoryRate.helper")} error={getFieldError("postIntroductoryRate")}>
            <div className="flex items-center gap-2">
              <NumberInput
                value={form.postIntroductoryRate}
                onChange={(v) => updateField("postIntroductoryRate", v)}
                step={0.1}
                lang={lang}
              />
              <span className="text-xs text-[var(--text-muted)]">{t("form.percent")}</span>
            </div>
          </FormField>

          <FormField label={t("form.introductoryPeriodMonths")} helper={t("form.introductoryPeriodMonths.helper")} error={getFieldError("introductoryPeriodMonths")}>
            <div className="flex items-center gap-2">
              <NumberInput
                value={form.introductoryPeriodMonths}
                onChange={(v) => updateField("introductoryPeriodMonths", v)}
                lang={lang}
              />
              <span className="text-xs text-[var(--text-muted)]">{t("form.months")}</span>
            </div>
          </FormField>
        </>
      )}
    </>
  );
}

function CashflowSection({
  form,
  updateField,
  getFieldError,
  t,
  lang,
}: {
  form: FormState;
  updateField: UpdateField;
  getFieldError: GetFieldError;
  t: TFunc;
  lang: "en" | "vi";
}) {
  return (
    <>
      <FormField label={t("form.monthlyIncome")} error={getFieldError("monthlyIncome")}>
        <NumberInput
          value={form.monthlyIncome}
          onChange={(v) => updateField("monthlyIncome", v)}
          suffix="₫"
          lang={lang}
        />
      </FormField>

      <FormField label={t("form.currentSavings")} helper={t("form.currentSavings.helper")} error={getFieldError("currentSavings")}>
        <NumberInput
          value={form.currentSavings}
          onChange={(v) => updateField("currentSavings", v)}
          suffix="₫"
          lang={lang}
        />
      </FormField>

      <FormField label={t("form.monthlyLivingExpenses")} error={getFieldError("monthlyLivingExpenses")}>
        <NumberInput
          value={form.monthlyLivingExpenses}
          onChange={(v) => updateField("monthlyLivingExpenses", v)}
          suffix="₫"
          lang={lang}
        />
      </FormField>

      <FormField label={t("form.monthlyOwnershipCosts")} helper={t("form.monthlyOwnershipCosts.helper")} error={getFieldError("monthlyOwnershipCosts")}>
        <NumberInput
          value={form.monthlyOwnershipCosts}
          onChange={(v) => updateField("monthlyOwnershipCosts", v)}
          suffix="₫"
          lang={lang}
        />
      </FormField>
    </>
  );
}

function SafetyBufferSection({
  form,
  updateField,
  getFieldError,
  t,
  lang,
}: {
  form: FormState;
  updateField: UpdateField;
  getFieldError: GetFieldError;
  t: TFunc;
  lang: "en" | "vi";
}) {
  return (
    <>
      <p className="text-xs text-[var(--text-muted)]">{t("form.section.optional")}</p>

      <FormField label={t("form.additionalMonthlyDebt")} error={getFieldError("additionalMonthlyDebt")}>
        <NumberInput
          value={form.additionalMonthlyDebt}
          onChange={(v) => updateField("additionalMonthlyDebt", v)}
          suffix="₫"
          lang={lang}
        />
      </FormField>

      <FormField label={t("form.dependants")} error={getFieldError("dependants")}>
        <NumberInput
          value={form.dependants}
          onChange={(v) => updateField("dependants", v)}
          lang={lang}
        />
      </FormField>

      <FormField label={t("form.scenarioNote")} error={getFieldError("scenarioNote")}>
        <textarea
          value={form.scenarioNote}
          onChange={(e) => updateField("scenarioNote", e.target.value)}
          placeholder={t("form.scenarioNote.placeholder")}
          rows={2}
          className="form-input resize-none"
        />
      </FormField>
    </>
  );
}

function StressTestSection({
  form,
  updateField,
  getFieldError,
  t,
  lang,
}: {
  form: FormState;
  updateField: UpdateField;
  getFieldError: GetFieldError;
  t: TFunc;
  lang: "en" | "vi";
}) {
  return (
    <>
      <FormField label={t("form.incomeDisruptionMonths")} helper={t("form.incomeDisruptionMonths.helper")} error={getFieldError("incomeDisruptionMonths")}>
        <div className="flex items-center gap-2">
          <NumberInput
            value={form.incomeDisruptionMonths}
            onChange={(v) => updateField("incomeDisruptionMonths", v)}
            lang={lang}
          />
          <span className="text-xs text-[var(--text-muted)]">{t("form.months")}</span>
        </div>
      </FormField>
      <FormField label={t("form.incomeDisruptionStartMonth")} error={getFieldError("incomeDisruptionStartMonth")}>
        <NumberInput value={form.incomeDisruptionStartMonth} onChange={(v) => updateField("incomeDisruptionStartMonth", v)} lang={lang} />
      </FormField>
      <FormField label={t("form.incomeReductionPercent")} error={getFieldError("incomeReductionPercent")}>
        <NumberInput value={form.incomeReductionPercent} onChange={(v) => updateField("incomeReductionPercent", v)} suffix="%" step={1} lang={lang} />
      </FormField>
      <FormField label={t("form.unexpectedEmergencyExpense")} error={getFieldError("unexpectedEmergencyExpense")}>
        <NumberInput value={form.unexpectedEmergencyExpense} onChange={(v) => updateField("unexpectedEmergencyExpense", v)} suffix="₫" lang={lang} />
      </FormField>
    </>
  );
}

// ============================================================================
// Reusable form components
// ============================================================================

function FormField({
  label,
  helper,
  error,
  children,
}: {
  label: string;
  helper?: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
        {label}
      </label>
      {children}
      {helper && !error && (
        <p className="mt-1 text-[10px] text-[var(--text-muted)]">{helper}</p>
      )}
      {error && (
        <p className="mt-1 text-[10px] text-[var(--accent-red)]">{error}</p>
      )}
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  suffix,
  step = 1,
  lang,
}: {
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
  step?: number;
  lang: "en" | "vi";
}) {
  // Display localized number, parse user input back
  const displayValue = lang === "vi"
    ? value.toLocaleString("vi-VN", { maximumFractionDigits: 2 })
    : value.toLocaleString("en-US", { maximumFractionDigits: 2 });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d.,]/g, "");
    // Normalize: remove thousand separators, convert comma to period
    const normalized = lang === "vi"
      ? raw.replace(/\./g, "").replace(",", ".")
      : raw.replace(/,/g, "");
    const num = parseFloat(normalized);
    onChange(isNaN(num) ? 0 : num);
  };

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={handleChange}
        step={step}
        className="form-input flex-1 tabular-nums"
      />
      {suffix && <span className="text-xs text-[var(--text-muted)]">{suffix}</span>}
    </div>
  );
}

function PreviewItem({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] text-[var(--text-muted)]">{label}</span>
      <span
        className="text-xs font-semibold tabular-nums"
        style={{ color: valueColor ?? "var(--text-secondary)" }}
      >
        {value}
      </span>
    </div>
  );
}

// ============================================================================
// Validation & preview computation
// ============================================================================

function getSectionFields(section: string): string[] {
  switch (section) {
    case "decision":
      return ["scenarioName", "propertyPrice", "downPayment", "loanAmount"];
    case "loanTerms":
      return ["loanTermYears", "introductoryRate", "postIntroductoryRate", "introductoryPeriodMonths"];
    case "cashflow":
      return ["monthlyIncome", "currentSavings", "monthlyLivingExpenses", "monthlyOwnershipCosts"];
    case "safetyBuffer":
      return ["additionalMonthlyDebt", "dependants", "scenarioNote"];
    case "stressTest":
      return ["incomeDisruptionMonths", "incomeDisruptionStartMonth", "incomeReductionPercent", "unexpectedEmergencyExpense"];
    default:
      return [];
  }
}

function validateForm(form: FormState): ValidationError[] {
  const errors: ValidationError[] = [];

  if (form.propertyPrice <= 0) {
    errors.push({ field: "propertyPrice", errorType: "propertyPricePositive" });
  }
  if (form.downPayment < 0 || form.downPayment >= form.propertyPrice) {
    errors.push({ field: "downPayment", errorType: "downPaymentRange" });
  }
  if (form.loanAmount <= 0) {
    errors.push({ field: "loanAmount", errorType: "loanAmountPositive" });
  }
  if (form.loanTermYears < 1 || form.loanTermYears > 40) {
    errors.push({ field: "loanTermYears", errorType: "loanTermRange" });
  }

  if (form.downPayment > form.propertyPrice) {
    errors.push({ field: "downPayment", errorType: "downPaymentExceedsPrice" });
  }
  if (form.loanAmount < 0) {
    errors.push({ field: "loanAmount", errorType: "loanAmountNegative" });
  }
  if (form.loanAmount > form.propertyPrice - form.downPayment + 1) {
    errors.push({ field: "loanAmount", errorType: "loanExceedsPrice" });
  }
  if (form.monthlyIncome <= 0) {
    errors.push({ field: "monthlyIncome", errorType: "incomeMustBePositive" });
  }
  if (form.introductoryRate < 0) {
    errors.push({ field: "introductoryRate", errorType: "rateNegative" });
  }
  if (form.postIntroductoryRate < 0) {
    errors.push({ field: "postIntroductoryRate", errorType: "rateNegative" });
  }
  if (form.introductoryRate > 40) {
    errors.push({ field: "introductoryRate", errorType: "rateExceedsMax" });
  }
  if (form.postIntroductoryRate > 40) {
    errors.push({ field: "postIntroductoryRate", errorType: "rateExceedsMax" });
  }
  if (!form.isFixedRate && form.introductoryPeriodMonths > form.loanTermYears * 12) {
    errors.push({ field: "introductoryPeriodMonths", errorType: "introExceedsTerm" });
  }
  if (form.monthlyLivingExpenses < 0) {
    errors.push({ field: "monthlyLivingExpenses", errorType: "expensesNegative" });
  }
  if (form.currentSavings < 0) {
    errors.push({ field: "currentSavings", errorType: "savingsNegative" });
  }
  if (form.monthlyOwnershipCosts < 0) {
    errors.push({ field: "monthlyOwnershipCosts", errorType: "expensesNegative" });
  }
  if (form.incomeDisruptionMonths < 0 || form.incomeDisruptionMonths > 24) {
    errors.push({ field: "incomeDisruptionMonths", errorType: "stressDurationRange" });
  }
  const horizon = Math.min(form.loanTermYears * 12, 480);
  if (form.incomeDisruptionStartMonth < 1 || form.incomeDisruptionStartMonth > horizon) {
    errors.push({ field: "incomeDisruptionStartMonth", errorType: "stressStartRange" });
  }
  if (form.incomeDisruptionStartMonth + form.incomeDisruptionMonths - 1 > horizon) {
    errors.push({ field: "incomeDisruptionMonths", errorType: "stressExceedsHorizon" });
  }
  if (form.incomeReductionPercent < 0 || form.incomeReductionPercent > 100) {
    errors.push({ field: "incomeReductionPercent", errorType: "incomeReductionRange" });
  }
  if (form.unexpectedEmergencyExpense < 0) {
    errors.push({ field: "unexpectedEmergencyExpense", errorType: "unexpectedExpenseNegative" });
  }

  return errors;
}

function computePreview(form: FormState) {
  const scenario = formToScenario(form);
  const metrics = getScenarioMetrics(scenario);
  const ownership = totalHousingBurden(scenario);
  const totalHousing = metrics.postResetPayment + ownership + (scenario.additionalMonthlyDebt ?? 0);
  const remainingCash = scenario.monthlyIncome - totalHousing - scenario.monthlyLivingExpenses;

  return {
    introPayment: metrics.introPayment,
    postResetPayment: metrics.postResetPayment,
    totalHousing,
    remainingCash,
    emergencyRunway: metrics.emergencyRunway,
    mortgageIncomeRatio: scenario.monthlyIncome > 0 ? (metrics.introPayment / scenario.monthlyIncome) * 100 : 0,
    postMortgageIncomeRatio: metrics.paymentToIncomeRatio,
    paymentIncreasePct: metrics.paymentIncreasePct,
  };
}
