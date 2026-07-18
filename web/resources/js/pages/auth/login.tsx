import { Form, Head } from '@inertiajs/react';
import { useState } from 'react';

import { store } from '@/actions/App/Http/Controllers/Auth/AuthenticatedSessionController';

const inputClassName =
    'min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-4 focus:ring-brand-light';

function RespondeMark() {
    return (
        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-white p-1.5 shadow-lg shadow-brand-dark/25">
            <img
                src="/respondelogo.jpg"
                alt="Responde logo"
                className="h-full w-full object-contain"
            />
        </div>
    );
}

function EyeIcon({ hidden }: { hidden: boolean }) {
    return hidden ? (
        <path
            d="m3 3 18 18M10.6 10.7a2 2 0 0 0 2.7 2.7M9.9 4.2A10.8 10.8 0 0 1 12 4c5 0 8.8 4.1 10 8a12.5 12.5 0 0 1-2.1 4.1M6.6 6.6A12 12 0 0 0 2 12c1.2 3.9 5 8 10 8 1.9 0 3.6-.6 5-1.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    ) : (
        <>
            <path
                d="M2 12c1.2-3.9 5-8 10-8s8.8 4.1 10 8c-1.2 3.9-5 8-10 8S3.2 15.9 2 12Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
            />
            <circle
                cx="12"
                cy="12"
                r="3"
                stroke="currentColor"
                strokeWidth="1.8"
            />
        </>
    );
}

export default function Login() {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <>
            <Head title="Sign in" />

            <main className="min-h-screen bg-slate-100 text-slate-950">
                <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
                    <section className="relative hidden overflow-hidden bg-brand p-12 text-white lg:flex lg:flex-col lg:justify-between">
                        <div
                            className="absolute inset-0 opacity-40"
                            style={{
                                backgroundImage:
                                    'linear-gradient(rgba(255,255,255,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.3) 1px, transparent 1px)',
                                backgroundSize: '44px 44px',
                            }}
                            aria-hidden="true"
                        />
                        <div className="relative flex items-center gap-4">
                            <RespondeMark />
                            <div>
                                <p className="text-2xl font-bold tracking-tight">
                                    Responde
                                </p>
                                <p className="text-sm text-white/85">
                                    Emergency Response System
                                </p>
                            </div>
                        </div>

                        <div className="relative max-w-xl">
                            <p className="mb-5 text-sm font-semibold tracking-[0.18em] text-white/85 uppercase">
                                Operations access
                            </p>
                            <h1 className="text-4xl leading-tight font-bold tracking-tight xl:text-5xl">
                                Manage response teams and emergency operations.
                            </h1>
                            <div className="mt-8 grid max-w-lg grid-cols-3 gap-3 text-sm">
                                {['Coordinate', 'Dispatch', 'Respond'].map(
                                    (item, index) => (
                                        <div
                                            key={item}
                                            className="rounded-xl border border-white/40 bg-white/25 p-4 shadow-sm backdrop-blur-sm"
                                        >
                                            <span className="mb-2 block text-xs text-white/85">
                                                0{index + 1}
                                            </span>
                                            <span className="font-semibold">
                                                {item}
                                            </span>
                                        </div>
                                    ),
                                )}
                            </div>
                        </div>

                        <p className="relative text-sm text-white/85">
                            Authorized LGU and response personnel only.
                        </p>
                    </section>

                    <section className="flex min-h-screen items-center justify-center p-5 sm:p-8 lg:p-12">
                        <div className="w-full max-w-md">
                            <div className="mb-9 flex items-center gap-3 lg:hidden">
                                <RespondeMark />
                                <div>
                                    <p className="text-xl font-bold tracking-tight">
                                        Responde
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        Emergency Response System
                                    </p>
                                </div>
                            </div>

                            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-9">
                                <div className="mb-8">
                                    <p className="mb-2 text-sm font-semibold text-emerald-600">
                                        Secure access
                                    </p>
                                    <h2 className="text-3xl font-bold tracking-tight text-slate-950">
                                        Sign in
                                    </h2>
                                    <p className="mt-2 text-sm leading-6 text-slate-500">
                                        Enter your assigned account details.
                                    </p>
                                </div>

                                <Form
                                    {...store.form()}
                                    resetOnError={['password']}
                                    onStart={() =>
                                        console.log(
                                            '[Responde Login] Form submitted',
                                        )
                                    }
                                    onSuccess={() =>
                                        console.log(
                                            '[Responde Login] Sign in successful',
                                        )
                                    }
                                    onError={() =>
                                        console.log(
                                            '[Responde Login] Sign in rejected',
                                        )
                                    }
                                >
                                    {({ errors, processing }) => (
                                        <div className="flex flex-col gap-5">
                                            <div>
                                                <label
                                                    htmlFor="email"
                                                    className="mb-2 block text-sm font-semibold text-slate-700"
                                                >
                                                    Email address
                                                </label>
                                                <input
                                                    id="email"
                                                    name="email"
                                                    type="email"
                                                    autoComplete="email"
                                                    autoFocus
                                                    required
                                                    placeholder="name@example.com"
                                                    aria-invalid={
                                                        errors.email
                                                            ? true
                                                            : undefined
                                                    }
                                                    aria-describedby={
                                                        errors.email
                                                            ? 'email-error'
                                                            : undefined
                                                    }
                                                    className={inputClassName}
                                                />
                                                {errors.email && (
                                                    <p
                                                        id="email-error"
                                                        role="alert"
                                                        className="mt-2 text-sm font-medium text-red-600"
                                                    >
                                                        {errors.email}
                                                    </p>
                                                )}
                                            </div>

                                            <div>
                                                <label
                                                    htmlFor="password"
                                                    className="mb-2 block text-sm font-semibold text-slate-700"
                                                >
                                                    Password
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        id="password"
                                                        name="password"
                                                        type={
                                                            showPassword
                                                                ? 'text'
                                                                : 'password'
                                                        }
                                                        autoComplete="current-password"
                                                        required
                                                        placeholder="Enter your password"
                                                        aria-invalid={
                                                            errors.password
                                                                ? true
                                                                : undefined
                                                        }
                                                        aria-describedby={
                                                            errors.password
                                                                ? 'password-error'
                                                                : undefined
                                                        }
                                                        className={`${inputClassName} pr-12`}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setShowPassword(
                                                                (visible) =>
                                                                    !visible,
                                                            )
                                                        }
                                                        aria-label={
                                                            showPassword
                                                                ? 'Hide password'
                                                                : 'Show password'
                                                        }
                                                        aria-pressed={
                                                            showPassword
                                                        }
                                                        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-slate-500 transition hover:text-brand-dark focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand"
                                                    >
                                                        <svg
                                                            viewBox="0 0 24 24"
                                                            fill="none"
                                                            className="h-5 w-5"
                                                            aria-hidden="true"
                                                        >
                                                            <EyeIcon
                                                                hidden={
                                                                    showPassword
                                                                }
                                                            />
                                                        </svg>
                                                    </button>
                                                </div>
                                                {errors.password && (
                                                    <p
                                                        id="password-error"
                                                        role="alert"
                                                        className="mt-2 text-sm font-medium text-red-600"
                                                    >
                                                        {errors.password}
                                                    </p>
                                                )}
                                            </div>

                                            <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-slate-600">
                                                <input
                                                    type="checkbox"
                                                    name="remember"
                                                    value="1"
                                                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                                />
                                                Keep me signed in
                                            </label>

                                            <button
                                                type="submit"
                                                disabled={processing}
                                                className="flex min-h-12 items-center justify-center rounded-xl bg-brand px-5 text-sm font-bold text-white shadow-lg shadow-brand/25 transition hover:bg-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                {processing
                                                    ? 'Signing in...'
                                                    : 'Sign in'}
                                            </button>
                                        </div>
                                    )}
                                </Form>
                            </div>

                            <p className="mt-6 text-center text-xs leading-5 text-slate-500">
                                Contact your administrator if you cannot access
                                your account.
                            </p>
                        </div>
                    </section>
                </div>
            </main>
        </>
    );
}
