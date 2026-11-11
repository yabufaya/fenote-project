import { useState, useEffect, useCallback, useRef } from 'react';
import { Formik, Form, Field, useFormikContext, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { SolidCard } from '../components/common/Cards';
import { api } from '../services/api';
import { usePublicRealtime } from '../hooks/usePublicRealtime';

const AutoSave = ({ saveDraft }) => {
    const { values } = useFormikContext();
    useEffect(() => { saveDraft(values); }, [values, saveDraft]);
    return null;
};

const FormField = ({ label, name, type = 'text', as = 'input', children }) => (
    <div className="mb-4">
        <label className="block text-sm font-medium mb-2 text-primary">{label}</label>
        <Field name={name} as={as} type={type} className="w-full px-4 py-3 rounded-xl border border-theme bg-primary text-primary text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition appearance-none">
            {children}
        </Field>
        <ErrorMessage name={name} component="div" className="text-red-400 text-xs mt-1 ml-1" />
    </div>
);


function formatDateLabel(dateString, timezone, language) {
    try {
        return new Intl.DateTimeFormat(language.startsWith('am') ? 'am-ET' : 'en-GB', {
            timeZone: timezone, weekday: 'short', month: 'short', day: 'numeric',
        }).format(new Date(`${dateString}T12:00:00Z`));
    } catch (_) {
        return dateString;
    }
}

// Final booking step: one rolling week of admin-controlled dates + one atomic,
// PII-free available time slot. Closed/full dates are disabled, not guessed.
const ScheduleStep = () => {
    const { values, setFieldValue } = useFormikContext();
    const { t, i18n } = useTranslation();
    const [slots, setSlots] = useState([]);
    const [dates, setDates] = useState([]);
    const [meta, setMeta] = useState({ timezone: 'Africa/Addis_Ababa', days_ahead: 7 });
    const [loadingAvailability, setLoadingAvailability] = useState(true);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const preferredDateRef = useRef(values.preferred_date);
    preferredDateRef.current = values.preferred_date;

    const loadAvailability = useCallback(async () => {
        try {
            const res = await api.getBookingAvailability();
            const data = res?.data || {};
            const nextDates = data.dates || [];
            setMeta(data.settings || { timezone: 'Africa/Addis_Ababa', days_ahead: 7 });
            setDates(nextDates);
            const firstOpen = nextDates.find((d) => d.is_open && d.slot_count > 0);
            if (!preferredDateRef.current && firstOpen) {
                setFieldValue('preferred_date', firstOpen.date, false);
            }
        } catch (_) {
            setDates([]);
        } finally {
            setLoadingAvailability(false);
        }
    }, [setFieldValue]);

    const refreshSlots = useCallback(async () => {
        const date = values.preferred_date;
        const selected = dates.find((d) => d.date === date);
        if (!date || (selected && (!selected.is_open || selected.slot_count === 0))) {
            setSlots([]);
            if (values.slot_start) setFieldValue('slot_start', '', false);
            return;
        }
        setLoadingSlots(true);
        try {
            const response = await api.getBookingSlots(date);
            const next = response?.data?.slots || [];
            setSlots(next);
            if (values.slot_start && !next.some((slot) => slot.slot_start === values.slot_start)) {
                setFieldValue('slot_start', '', false);
            }
        } catch (_) {
            setSlots([]);
        } finally {
            setLoadingSlots(false);
        }
    }, [values.preferred_date, values.slot_start, dates, setFieldValue]);

    useEffect(() => { loadAvailability(); }, [loadAvailability]);
    useEffect(() => { refreshSlots(); }, [refreshSlots]);
    usePublicRealtime(['booking_availability_state'], refreshSlots, 30000);

    useEffect(() => {
        const handler = () => { loadAvailability(); refreshSlots(); };
        window.addEventListener('fenote:booking-slots-refresh', handler);
        return () => window.removeEventListener('fenote:booking-slots-refresh', handler);
    }, [loadAvailability, refreshSlots]);

    const selectedDate = dates.find((d) => d.date === values.preferred_date);

    return (
        <div className="space-y-6">
            <div className="rounded-2xl border border-theme bg-card/40 p-4 text-sm text-secondary">
                <p>{t('book.messages.slotNotice')}</p>
                <p className="text-xs text-muted mt-1">{t('book.messages.timezoneNote')} {t('book.messages.chooseDate')}</p>
            </div>
            <div>
                <label className="block text-sm font-medium mb-3 text-primary">{t('book.fields.appointmentDate')}</label>
                {loadingAvailability ? (
                    <p className="text-xs text-muted">{t('book.messages.submitting')}</p>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {dates.map((dateInfo) => {
                            const disabled = !dateInfo.is_open || dateInfo.slot_count === 0;
                            const selected = values.preferred_date === dateInfo.date;
                            return (
                                <button
                                    type="button"
                                    key={dateInfo.date}
                                    data-testid="booking-date"
                                    data-open={dateInfo.is_open ? 'true' : 'false'}
                                    disabled={disabled}
                                    onClick={() => {
                                        setFieldValue('preferred_date', dateInfo.date, false);
                                        setFieldValue('slot_start', '', false);
                                    }}
                                    className={`rounded-xl border p-3 text-left transition ${selected ? 'border-accent bg-fenote-50 text-primary' : 'border-theme bg-primary text-secondary'} ${disabled ? 'opacity-45 cursor-not-allowed' : 'hover:border-accent'}`}
                                >
                                    <span className="block text-sm font-semibold">{formatDateLabel(dateInfo.date, meta.timezone, i18n.language)}</span>
                                    <span className="block text-[10px] mt-1 text-muted">
                                        {dateInfo.is_open
                                            ? (dateInfo.slot_count > 0 ? t('book.messages.availableSlots', { count: dateInfo.slot_count }) : t('book.messages.fullDay'))
                                            : t('book.messages.closedDay')}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )}
                <ErrorMessage name="preferred_date" component="div" className="text-red-400 text-xs mt-1 ml-1" />
            </div>
            <div>
                <label className="block text-sm font-medium mb-3 text-primary">{t('book.fields.appointmentTime')}</label>
                {!values.preferred_date ? (
                    <p className="text-xs text-muted">{t('book.messages.chooseDate')}</p>
                ) : selectedDate && !selectedDate.is_open ? (
                    <p className="text-xs text-amber-500">{t('book.messages.closedDay')}</p>
                ) : selectedDate && selectedDate.slot_count === 0 ? (
                    <p className="text-xs text-amber-500">{t('book.messages.fullDay')}</p>
                ) : loadingSlots ? (
                    <p className="text-xs text-muted">{t('book.messages.submitting')}</p>
                ) : slots.length === 0 ? (
                    <p className="text-xs text-amber-500">{t('book.messages.noSlots')}</p>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {slots.map((slot) => (
                            <label key={slot.slot_start} data-testid="booking-slot" className="flex items-center justify-center gap-2 p-3 rounded-xl border border-theme cursor-pointer hover:bg-fenote-50 transition text-sm text-secondary">
                                <Field type="radio" name="slot_start" value={slot.slot_start} className="w-4 h-4 accent-blue-500" />
                                {slot.label}
                            </label>
                        ))}
                    </div>
                )}
                <ErrorMessage name="slot_start" component="div" className="text-red-400 text-xs mt-2 ml-1" />
            </div>
        </div>
    );
};

const stepIcons = ['solar:user-bold', 'solar:document-text-bold', 'solar:heart-pulse-bold', 'solar:health-bold', 'solar:danger-triangle-bold', 'solar:phone-calling-bold', 'solar:clock-circle-bold'];

const initialValues = {
    name: '', father_name: '', email: '', phone: '', sex: '', age: 18, religion: '',
    education: '', occupation: '', marital_status: '', financial_status: '', children_count: 0,
    therapy_type: [], previous_treatment: false, treatment_date: '', family_mental_history: '', medication: '',
    physical_health: '', eating_habit: '', sleeping_habit: '', chronic_pain: '', exercise: '', substance_use: '',
    problems: [], other_problem: '', trauma: '', expectations: [],
    city: '', sub_city: '', kebele: '', house_no: '',
    preferred_language: '', communication_type: '', additional_info: '', referral_source: [],
    emergency_contact_came: '', emergency_contact_phone: '',
    preferred_date: '', slot_start: '',
};

export default function BookOverlay({ onClose }) {
    const [step, setStep] = useState(0);
    const { t } = useTranslation();
    const STORAGE_KEY = 'fenote_book_form_draft';

    const steps = ['personal', 'background', 'therapy', 'health', 'problems', 'contact', 'schedule'];

    const genderOptions = {
        MALE: t('book.options.gender.MALE'), FEMALE: t('book.options.gender.FEMALE'),
    };
    const educationOptions = {
        HIGH_SCHOOL: t('book.options.education.HIGH_SCHOOL'), BACHELORS: t('book.options.education.BACHELORS'),
        MASTERS: t('book.options.education.MASTERS'), PHD: t('book.options.education.PHD'),
    };
    const maritalOptions = {
        SINGLE: t('book.options.marital.SINGLE'), INRELATIONSHIP: t('book.options.marital.INRELATIONSHIP'),
        MARRIED: t('book.options.marital.MARRIED'), DIVORCED: t('book.options.marital.DIVORCED'),
        WINDOWED: t('book.options.marital.WINDOWED'),
    };
    const financialOptions = {
        GOOD: t('book.options.financial.GOOD'), MEDIUM: t('book.options.financial.MEDIUM'), POOR: t('book.options.financial.POOR'),
    };
    const healthOptions = {
        GOOD: t('book.options.health.GOOD'), MEDIUM: t('book.options.health.MEDIUM'), POOR: t('book.options.health.POOR'),
    };
    const eatingOptions = {
        GOOD: t('book.options.eating.GOOD'), MEDIUM: t('book.options.eating.MEDIUM'), POOR: t('book.options.eating.POOR'),
    };
    const sleepingOptions = {
        GOOD: t('book.options.sleeping.GOOD'), MEDIUM: t('book.options.sleeping.MEDIUM'), POOR: t('book.options.sleeping.POOR'),
    };
    const traumaOptions = {
        YES: t('book.options.trauma.YES'), NO: t('book.options.trauma.NO'),
    };
    const therapyOptions = {
        INDIVIDUAL: t('book.options.therapy.INDIVIDUAL'), COUPLES: t('book.options.therapy.COUPLES'),
        MARRIAGE: t('book.options.therapy.MARRIAGE'), FAMILY: t('book.options.therapy.FAMILY'),
        ADDICTION: t('book.options.therapy.ADDICTION'),
    };
    const problemOptions = {
        EDUCATIONAL: t('book.options.problems.EDUCATIONAL'), PERSONAL: t('book.options.problems.PERSONAL'),
        SOCIAL: t('book.options.problems.SOCIAL'), FAMILIAL: t('book.options.problems.FAMILIAL'),
        PEER: t('book.options.problems.PEER'), SEXUAL: t('book.options.problems.SEXUAL'),
        ROMANTIC: t('book.options.problems.ROMANTIC'), EMOTIONAL_PSYCHOLOGICAL: t('book.options.problems.EMOTIONAL_PSYCHOLOGICAL'),
        PHYSICAL_HEALTH: t('book.options.problems.PHYSICAL_HEALTH'), MENTAL_HEALTH: t('book.options.problems.MENTAL_HEALTH'),
        FINANCIAL: t('book.options.problems.FINANCIAL'), PROFESSIONAL_SKILL: t('book.options.problems.PROFESSIONAL_SKILL'),
        TIME_MANAGEMENT: t('book.options.problems.TIME_MANAGEMENT'), ADDICTION: t('book.options.problems.ADDICTION'),
    };
    const expectationOptions = {
        LISTEN: t('book.options.expectations.LISTEN'), HISTORY: t('book.options.expectations.HISTORY'),
        NEW: t('book.options.expectations.NEW'), ATTITUDE: t('book.options.expectations.ATTITUDE'),
        HOUSE: t('book.options.expectations.HOUSE'), AIM: t('book.options.expectations.AIM'),
        CONDITION: t('book.options.expectations.CONDITION'),
    };
    const languageOptions = {
        AMHARIC: t('book.options.language.AMHARIC'), ENGLISH: t('book.options.language.ENGLISH'),
    };
    const communicationOptions = {
        FACETOFACE: t('book.options.communication.FACETOFACE'), VIDEOCALL: t('book.options.communication.VIDEOCALL'),
        PHONECALL: t('book.options.communication.PHONECALL'),
    };
    const referralOptions = {
        INTERNET: t('book.options.referral.INTERNET'), MEDIA: t('book.options.referral.MEDIA'),
        TICKTOK: t('book.options.referral.TICKTOK'), FAMILY: t('book.options.referral.FAMILY'),
        YOUTUBE: t('book.options.referral.YOUTUBE'), HISTOEY: t('book.options.referral.HISTOEY'),
    };

    const validationSchemas = [
        Yup.object({
            name: Yup.string().required(t('common.required')), father_name: Yup.string().required(t('common.required')),
            email: Yup.string().email(t('common.invalidEmail')).required(t('common.required')),
            phone: Yup.string().required(t('common.required')), sex: Yup.string().required(t('common.required')),
            age: Yup.number().required(t('common.required')).positive(), religion: Yup.string().required(t('common.required')),
        }),
        Yup.object({ education: Yup.string().required(t('common.required')), occupation: Yup.string().required(t('common.required')) }),
        Yup.object({ therapy_type: Yup.array().min(1, t('common.selectAtLeastOne')) }),
        Yup.object({ physical_health: Yup.string().required(t('common.required')) }),
        Yup.object({ problems: Yup.array().min(1, t('common.selectAtLeastOne')) }),
        Yup.object({
            city: Yup.string().required(t('common.required')), emergency_contact_came: Yup.string().required(t('common.required')),
            emergency_contact_phone: Yup.string().required(t('common.required')),
        }),
        Yup.object({
            preferred_date: Yup.string().required(t('book.messages.selectSlot')),
            slot_start: Yup.string().required(t('book.messages.selectSlot')),
        }),
    ];

    const getSavedData = () => {
        if (typeof window === 'undefined') return initialValues;
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved ? { ...initialValues, ...JSON.parse(saved) } : initialValues;
        } catch {
            return initialValues;
        }
    };

    const saveDraft = useCallback((values) => localStorage.setItem(STORAGE_KEY, JSON.stringify(values)), []);

    const handleSubmit = async (values, { resetForm }) => {
        try {
            await api.createBooking(values);
            toast.success(t('book.messages.success'));
            localStorage.removeItem(STORAGE_KEY);
            resetForm({ values: initialValues });
            setTimeout(() => onClose(), 2000);
        } catch (err) {
            if (err?.status === 409 || err?.code === 'SLOT_UNAVAILABLE') {
                setStep(steps.length - 1);
                window.dispatchEvent(new CustomEvent('fenote:booking-slots-refresh'));
                toast.error(t('book.messages.slotTaken'));
            } else {
                toast.error(t('book.messages.error'));
            }
        }
    };

    const selectOptions = (options) => Object.entries(options).map(([k, v]) => <option key={k} value={k}>{v}</option>);

    return (
        <div className="py-12">
            <div className="sticky top-0 z-10 px-4 sm:px-6 lg:px-8 py-4 bg-glass border-b border-theme">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-gradient-to-br from-fenote-500 to-mint-500">
                            <Icon icon="solar:calendar-bold" className="text-white text-lg" />
                        </div>
                        <h2 className="font-bold text-xl text-primary">{t('book.title')}</h2>
                    </div>
                    <button type="button" onClick={onClose} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-card border border-theme text-primary hover:shadow-lg transition">
                        <Icon icon="solar:arrow-left-linear" /> {t('nav.backHome')}
                    </button>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-10 flex justify-between items-center relative">
                    <div className="absolute top-5 left-0 w-full h-1 bg-card rounded-full z-0">
                        <div className="h-full rounded-full bg-gradient-to-r from-fenote-500 to-mint-500 transition-all duration-500" style={{ width: `${(step / (steps.length - 1)) * 100}%` }}></div>
                    </div>
                    {steps.map((key, index) => (
                        <div key={key} className="flex flex-col items-center z-10 relative">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${index <= step ? 'bg-gradient-to-r from-fenote-500 to-mint-500 border-transparent text-white' : 'bg-secondary border-theme text-muted'}`}>
                                <Icon icon={stepIcons[index]} className="text-lg" />
                            </div>
                            <span className={`text-[10px] mt-2 font-medium hidden sm:block ${index <= step ? 'text-accent' : 'text-muted'}`}>{t(`book.steps.${key}`)}</span>
                        </div>
                    ))}
                </div>

                <SolidCard className="p-6 sm:p-10">
                    <Formik initialValues={getSavedData()} validationSchema={validationSchemas[step]} enableReinitialize onSubmit={handleSubmit}>
                        {({ validateForm, isSubmitting }) => (
                            <Form className="space-y-2">
                                <AutoSave saveDraft={saveDraft} />
                                <AnimatePresence mode="wait">
                                    <motion.div key={step} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} transition={{ duration: 0.3 }}>

                                        {step === 0 && (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                                                <FormField label={t('book.fields.name')} name="name" />
                                                <FormField label={t('book.fields.fatherName')} name="father_name" />
                                                <FormField label={t('book.fields.email')} name="email" type="email" />
                                                <FormField label={t('book.fields.phone')} name="phone" />
                                                <FormField label={t('book.fields.sex')} name="sex" as="select">
                                                    <option value="">{t('book.selectGender')}</option>
                                                    {selectOptions(genderOptions)}
                                                </FormField>
                                                <FormField label={t('book.fields.religion')} name="religion" />
                                                <FormField label={t('book.fields.age')} name="age" type="number" />
                                            </div>
                                        )}

                                        {step === 1 && (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                                                <FormField label={t('book.fields.education')} name="education" as="select">
                                                    <option value="">{t('common.select')}</option>
                                                    {selectOptions(educationOptions)}
                                                </FormField>
                                                <FormField label={t('book.fields.occupation')} name="occupation" />
                                                <FormField label={t('book.fields.maritalStatus')} name="marital_status" as="select">
                                                    <option value="">{t('common.select')}</option>
                                                    {selectOptions(maritalOptions)}
                                                </FormField>
                                                <FormField label={t('book.fields.financialStatus')} name="financial_status" as="select">
                                                    <option value="">{t('common.select')}</option>
                                                    {selectOptions(financialOptions)}
                                                </FormField>
                                                <FormField label={t('book.fields.childrenCount')} name="children_count" type="number" />
                                            </div>
                                        )}

                                        {step === 2 && (
                                            <div className="space-y-6">
                                                <div>
                                                    <label className="block text-sm font-medium mb-3 text-primary">{t('book.fields.therapyType')}</label>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        {Object.entries(therapyOptions).map(([k, v]) => (
                                                            <label key={k} className="flex items-center gap-3 p-3 rounded-xl border border-theme cursor-pointer hover:bg-fenote-50 transition">
                                                                <Field type="checkbox" name="therapy_type" value={k} className="w-4 h-4 accent-blue-500" />
                                                                <span className="text-sm text-secondary">{v}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                    <ErrorMessage name="therapy_type" component="div" className="text-red-400 text-xs mt-2 ml-1" />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium mb-3 text-primary">{t('book.fields.previousTreatment')}</label>
                                                    <div className="flex gap-6">
                                                        {['true', 'false'].map(v => (
                                                            <label key={v} className="flex items-center gap-2 cursor-pointer">
                                                                <Field type="radio" name="previous_treatment" value={v} className="w-4 h-4 accent-blue-500" />
                                                                <span className="text-sm text-secondary">{v === 'true' ? t('common.yes') : t('common.no')}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                                <FormField label={t('book.fields.treatmentDate')} name="treatment_date" type="date" />
                                                <FormField label={t('book.fields.familyMentalHistory')} name="family_mental_history" />
                                                <FormField label={t('book.fields.medication')} name="medication" />
                                            </div>
                                        )}

                                        {step === 3 && (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                                                <FormField label={t('book.fields.physicalHealth')} name="physical_health" as="select">
                                                    <option value="">{t('common.select')}</option>
                                                    {selectOptions(healthOptions)}
                                                </FormField>
                                                <FormField label={t('book.fields.eatingHabit')} name="eating_habit" as="select">
                                                    <option value="">{t('common.select')}</option>
                                                    {selectOptions(eatingOptions)}
                                                </FormField>
                                                <FormField label={t('book.fields.sleepingHabit')} name="sleeping_habit" as="select">
                                                    <option value="">{t('common.select')}</option>
                                                    {selectOptions(sleepingOptions)}
                                                </FormField>
                                                <FormField label={t('book.fields.chronicPain')} name="chronic_pain" />
                                                <FormField label={t('book.fields.exercise')} name="exercise" />
                                                <FormField label={t('book.fields.substanceUse')} name="substance_use" />
                                            </div>
                                        )}

                                        {step === 4 && (
                                            <div className="space-y-6">
                                                <div>
                                                    <label className="block text-sm font-medium mb-3 text-primary">{t('book.fields.problems')}</label>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                        {Object.entries(problemOptions).map(([k, v]) => (
                                                            <label key={k} className="flex items-start gap-2 p-2 rounded-lg hover:bg-fenote-50 cursor-pointer">
                                                                <Field type="checkbox" name="problems" value={k} className="w-4 h-4 mt-0.5 accent-blue-500" />
                                                                <span className="text-xs text-secondary">{v}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                    <ErrorMessage name="problems" component="div" className="text-red-400 text-xs mt-2 ml-1" />
                                                </div>
                                                <FormField label={t('book.fields.otherProblem')} name="other_problem" as="textarea" />
                                                <div>
                                                    <label className="block text-sm font-medium mb-3 text-primary">{t('book.fields.expectations')}</label>
                                                    <div className="space-y-2">
                                                        {Object.entries(expectationOptions).map(([k, v]) => (
                                                            <label key={k} className="flex items-start gap-2 cursor-pointer">
                                                                <Field type="checkbox" name="expectations" value={k} className="w-4 h-4 mt-0.5 accent-blue-500" />
                                                                <span className="text-sm text-secondary">{v}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium mb-3 text-primary">{t('book.fields.trauma')}</label>
                                                    <div className="space-y-2">
                                                        {Object.entries(traumaOptions).map(([k, v]) => (
                                                            <label key={k} className="flex items-center gap-2 cursor-pointer">
                                                                <Field type="radio" name="trauma" value={k} className="w-4 h-4 accent-blue-500" />
                                                                <span className="text-sm text-secondary">{v}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {step === 5 && (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                                                <FormField label={t('book.fields.city')} name="city" />
                                                <FormField label={t('book.fields.subCity')} name="sub_city" />
                                                <FormField label={t('book.fields.kebele')} name="kebele" />
                                                <FormField label={t('book.fields.houseNo')} name="house_no" />
                                                <FormField label={t('book.fields.preferredLanguage')} name="preferred_language" as="select">
                                                    <option value="">{t('common.select')}</option>
                                                    {selectOptions(languageOptions)}
                                                </FormField>
                                                <FormField label={t('book.fields.communicationType')} name="communication_type" as="select">
                                                    <option value="">{t('common.select')}</option>
                                                    {selectOptions(communicationOptions)}
                                                </FormField>
                                                <div className="sm:col-span-2">
                                                    <label className="block text-sm font-medium mb-3 text-primary">{t('book.fields.referralSource')}</label>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {Object.entries(referralOptions).map(([k, v]) => (
                                                            <label key={k} className="flex items-center gap-2 p-2 rounded-lg hover:bg-fenote-50 cursor-pointer">
                                                                <Field type="checkbox" name="referral_source" value={k} className="w-4 h-4 accent-blue-500" />
                                                                <span className="text-xs text-secondary">{v}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                                <FormField label={t('book.fields.additionalInfo')} name="additional_info" />
                                                <FormField label={t('book.fields.emergencyName')} name="emergency_contact_came" />
                                                <FormField label={t('book.fields.emergencyPhone')} name="emergency_contact_phone" />
                                            </div>
                                        )}

                                        {step === 6 && <ScheduleStep />}

                                    </motion.div>
                                </AnimatePresence>

                                <div className="flex justify-between pt-8 mt-4 border-t border-theme">
                                    <button type="button" onClick={() => setStep(prev => prev - 1)} disabled={step === 0} className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition ${step === 0 ? 'text-muted cursor-not-allowed' : 'bg-card border border-theme text-primary hover:shadow-md'}`}>
                                        <Icon icon="solar:arrow-left-linear" /> {t('common.back')}
                                    </button>

                                    {step < steps.length - 1 ? (
                                        <button type="button" onClick={async () => {
                                            const errors = await validateForm();
                                            if (Object.keys(errors).length === 0) setStep(prev => prev + 1);
                                            else toast.error(t('book.messages.fillRequired'));
                                        }} className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-white bg-gradient-to-r from-fenote-500 to-mint-500 hover:shadow-lg transition">
                                            {t('common.next')} <Icon icon="solar:arrow-right-linear" />
                                        </button>
                                    ) : (
                                        <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-8 py-3 rounded-xl font-medium text-white bg-gradient-to-r from-fenote-500 to-mint-500 hover:shadow-lg transition disabled:opacity-50">
                                            {isSubmitting ? t('common.submitting') : t('book.messages.submitBooking')} <Icon icon="solar:check-circle-bold" />
                                        </button>
                                    )}
                                </div>
                            </Form>
                        )}
                    </Formik>
                </SolidCard>
            </div>
        </div>
    );
}
