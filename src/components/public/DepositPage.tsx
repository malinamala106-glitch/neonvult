'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { User, CryptoWallet } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { BrandLock } from '@/components/shared/BrandName'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { CopyButton } from '@/components/shared/CopyButton'
import { TelegramButton } from '@/components/shared/TelegramButton'
import { SiteFooter } from '@/components/shared/SiteFooter'
import { SiteNavLinks } from '@/components/shared/SiteNavLinks'
import { formatMoney } from '@/lib/format'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { QRCodeSVG } from 'qrcode.react'
import {
  ArrowRight, Loader2, ArrowDownCircle, CheckCircle2, QrCode,
  Bitcoin, ShieldCheck,
} from 'lucide-react'

interface Props {
  user: User
  wallets: CryptoWallet[]
  minDeposit: number
  siteName?: string
  /** Optional Telegram support link URL for the "Contact via Telegram" button. */
  telegramUrl?: string | null
}

export function DepositPage({ user, wallets, minDeposit, siteName = 'AccsPoint', telegramUrl }: Props) {
  const router = useRouter()

  // Deposit methods come straight from the admin-managed Crypto Wallets table
  // (only active wallets with an address are offered).
  const activeWallets = wallets.filter((w) => w.isActive && !!w.address)

  // Flow state
  const [step, setStep] = useState<'amount' | 'network' | 'review' | 'confirm'>('amount')
  const [amount, setAmount] = useState('')
  const [walletId, setWalletId] = useState('')
  const [txHash, setTxHash] = useState('')
  const [showQR, setShowQR] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const numericAmount = parseFloat(amount) || 0
  const amountValid = numericAmount >= Math.max(1, minDeposit)
  const selectedWallet = activeWallets.find((w) => w.id === walletId) ?? null
  const depositAddress = selectedWallet?.address ?? ''

  function resetFlow() {
    setAmount('')
    setWalletId('')
    setTxHash('')
    setShowQR(false)
    setStep('amount')
  }

  // Step 1 → 2: amount entered, show network selector
  function proceedToNetwork() {
    if (!amountValid) {
      toast.error(`Minimum deposit is $${Math.max(1, minDeposit).toFixed(2)}`)
      return
    }
    if (activeWallets.length === 0) {
      toast.error('No deposit methods are available right now. Please contact support.')
      return
    }
    setStep('network')
  }

  // Step 2 → 3: wallet selected, show deposit address + review
  function proceedToReview(w: CryptoWallet) {
    setWalletId(w.id)
    setStep('review')
  }

  // Step 3 → open confirm dialog (asks for TRX ID)
  function openConfirmDialog() {
    if (!selectedWallet) return
    setConfirmOpen(true)
  }

  // Final submission — second click of "Confirm Deposit"
  async function submitDeposit() {
    if (!txHash.trim()) {
      toast.error('Please enter the transaction hash / ID')
      return
    }
    if (!selectedWallet) {
      toast.error('Select a deposit method first')
      return
    }
    setSubmitting(true)
    try {
      // The exact wallet row backs the submission, so admin sees precisely
      // which address the user says they paid to.
      const result = await api.createDeposit({
        walletId: selectedWallet.id,
        network: selectedWallet.network,
        amount: numericAmount,
        txHash: txHash.trim(),
      })
      setConfirmOpen(false)
      // Navigate to the pending page (10-minute countdown + contact buttons)
      router.push(`/deposit/pending?id=${result.id}`)
    } catch (e: any) {
      toast.error(e.message || 'Failed to submit deposit')
    } finally {
      setSubmitting(false)
    }
  }

  const methodsText =
    activeWallets.length > 0
      ? activeWallets.map((w) => w.network).join(', ')
      : 'the supported networks'

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <BrandLock />
          </div>
          <div className="flex items-center gap-3">
            <TelegramButton />
            <div className="text-right">
              <div className="text-xs text-zinc-500">Balance</div>
              <div className="font-bold text-red-600 dark:text-red-400">{formatMoney(user.balance)}</div>
            </div>
            <Button variant="outline" size="sm" onClick={() => router.push('/')}>
              <ArrowRight className="w-4 h-4 rotate-180" />
              <span className="hidden sm:inline ml-1">Back</span>
            </Button>
          </div>
        </div>
        {/* Secondary nav: admin-editable page links (Site content → Navigation links) */}
        <SiteNavLinks />
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-3 sm:px-6 py-6 sm:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: deposit flow */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                <ArrowDownCircle className="w-7 h-7 text-red-600" /> Deposit Funds
              </h1>
              <p className="text-sm text-zinc-500 mt-1">
                Pick one of our deposit methods ({methodsText}). All deposits are manually
                verified by an admin before your balance is updated.
              </p>
            </div>

            {/* Step indicator */}
            <div className="flex items-center gap-2 text-xs">
              <StepBadge active={step === 'amount'} done={step !== 'amount'} number={1} label="Amount" />
              <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
              <StepBadge active={step === 'network'} done={step === 'review'} number={2} label="Network" />
              <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
              <StepBadge active={step === 'review'} done={false} number={3} label="Deposit" />
            </div>

            {/* STEP 1: Amount */}
            {step === 'amount' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">1. Enter deposit amount</CardTitle>
                  <CardDescription>How much (in USD value) do you want to deposit? Minimum ${Math.max(1, minDeposit).toFixed(2)}.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount (USD)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-medium">$</span>
                      <Input
                        id="amount"
                        type="number"
                        min={Math.max(1, minDeposit)}
                        step="0.01"
                        placeholder="e.g. 50"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="pl-7 text-lg font-medium"
                        autoFocus
                        onKeyDown={(e) => { if (e.key === 'Enter') proceedToNetwork() }}
                      />
                    </div>
                    {amount && !amountValid && (
                      <p className="text-xs text-red-500">Minimum deposit is ${Math.max(1, minDeposit).toFixed(2)}.</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => router.push('/')} className="flex-1">
                      Cancel
                    </Button>
                    <Button
                      onClick={proceedToNetwork}
                      disabled={!amountValid || activeWallets.length === 0}
                      className="bg-red-600 hover:bg-red-700 text-white flex-1"
                    >
                      Continue
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* STEP 2: Method (from admin wallets) */}
            {step === 'network' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">2. Select deposit method</CardTitle>
                  <CardDescription>Choose one of our available deposit methods. We'll show the matching deposit address on the next step.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {activeWallets.map((w) => (
                      <button
                        key={w.id}
                        onClick={() => proceedToReview(w)}
                        className={`text-left px-4 py-3 rounded-lg border-2 transition-all border-zinc-200 dark:border-zinc-700 hover:border-red-400 hover:bg-red-50/50 dark:hover:bg-red-950/20 ${
                          walletId === w.id ? 'border-red-500 dark:border-red-600' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Bitcoin className="w-4 h-4 text-red-600" />
                          <span className="font-semibold text-sm">{w.network}</span>
                        </div>
                        {w.label && <div className="text-xs text-zinc-500">{w.label}</div>}
                        <div className="text-[10px] text-zinc-400 mt-1 truncate">{w.address}</div>
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" onClick={() => setStep('amount')}>
                      <ArrowRight className="w-4 h-4 rotate-180" />
                      Back
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* STEP 3: Review deposit info */}
            {step === 'review' && selectedWallet && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">3. Review deposit info</CardTitle>
                  <CardDescription>Send exactly <span className="font-semibold text-red-700 dark:text-red-300">${numericAmount.toFixed(2)}</span> of crypto (USD value) to the address below.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Deposit info table */}
                  <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800">
                    <InfoRow label="Network" value={selectedWallet.network} icon={<Bitcoin className="w-4 h-4 text-red-600" />} />
                    {selectedWallet.label && <InfoRow label="Label" value={selectedWallet.label} />}
                    <InfoRow
                      label="Amount"
                      value={`$${numericAmount.toFixed(2)} USD`}
                      copyValue={numericAmount.toFixed(2)}
                    />
                    <InfoRow
                      label="Address"
                      value={depositAddress}
                      copyValue={depositAddress}
                      mono
                    />
                  </div>

                  {/* QR code toggle */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowQR((v) => !v)}
                      className="flex-1"
                    >
                      <QrCode className="w-4 h-4 mr-2" />
                      {showQR ? 'Hide QR code' : 'Show QR code'}
                    </Button>
                  </div>

                  {showQR && (
                    <div className="flex flex-col items-center gap-3 p-4 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                      <QRCodeSVG
                        value={depositAddress}
                        size={200}
                        level="M"
                        bgColor="#ffffff"
                        fgColor="#000000"
                      />
                      <p className="text-xs text-zinc-500 text-center max-w-xs">
                        Scan this QR code with your wallet app — it contains only the deposit address.
                      </p>
                    </div>
                  )}

                  {/* Warning */}
                  <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 text-xs text-amber-800 dark:text-amber-200 flex gap-2">
                    <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold mb-1">Important</p>
                      <p>Send funds via the <span className="font-mono">{selectedWallet.network}</span> network shown above. Using a different network or an unsupported token may result in permanent loss of funds.</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button variant="outline" onClick={() => setStep('network')} className="sm:flex-1">
                      <ArrowRight className="w-4 h-4 rotate-180" />
                      Back
                    </Button>
                    <Button
                      onClick={openConfirmDialog}
                      className="bg-red-600 hover:bg-red-700 text-white sm:flex-1"
                    >
                      Confirm Deposit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right: sidebar */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Your balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600 dark:text-red-400">{formatMoney(user.balance)}</div>
                <p className="text-xs text-zinc-500 mt-1">Available to spend</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">How it works</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 flex items-center justify-center shrink-0 text-xs font-bold">1</div>
                  <div>
                    <div className="font-medium">Enter amount</div>
                    <p className="text-xs text-zinc-500">Minimum ${Math.max(1, minDeposit).toFixed(2)} USD.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 flex items-center justify-center shrink-0 text-xs font-bold">2</div>
                  <div>
                    <div className="font-medium">Pick method</div>
                    <p className="text-xs text-zinc-500">{activeWallets.length > 0 ? activeWallets.map((w) => w.network).join(', ') + '.' : 'Choose from the available methods.'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 flex items-center justify-center shrink-0 text-xs font-bold">3</div>
                  <div>
                    <div className="font-medium">Send crypto</div>
                    <p className="text-xs text-zinc-500">Send to the address shown (or scan QR).</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 flex items-center justify-center shrink-0 text-xs font-bold">4</div>
                  <div>
                    <div className="font-medium">Confirm with TX ID</div>
                    <p className="text-xs text-zinc-500">Enter the transaction hash and submit.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 flex items-center justify-center shrink-0 text-xs font-bold">5</div>
                  <div>
                    <div className="font-medium">Admin verifies</div>
                    <p className="text-xs text-zinc-500">Balance credited after manual approval.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-red-700 dark:text-red-400">
                  <ShieldCheck className="w-4 h-4" /> Manual verification
                </div>
                <p className="text-xs text-red-700/80 dark:text-red-400/80">
                  Every deposit is reviewed by an admin. Don't worry if it takes a few minutes — your balance will be credited once approved.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <SiteFooter siteName={siteName} userEmail={user.email} />

      {/* Confirm Deposit dialog — asks for TRX ID, then submits */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-red-600" /> Confirm your deposit
            </DialogTitle>
            <DialogDescription>
              Enter the transaction ID (TX hash) from your wallet. We'll send all deposit info to the admin for verification.
            </DialogDescription>
          </DialogHeader>

          {/* Deposit summary inside the dialog */}
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800 text-sm w-full overflow-hidden">
            <InfoRow label="Network" value={selectedWallet?.network || ''} icon={<Bitcoin className="w-4 h-4 text-red-600" />} />
            <InfoRow label="Amount" value={`$${numericAmount.toFixed(2)} USD`} />
            <InfoRow label="Address" value={depositAddress} copyValue={depositAddress} mono />
          </div>

          <div className="space-y-2">
            <Label htmlFor="txHash">Transaction ID (TX hash) <span className="text-red-500">*</span></Label>
            <Input
              id="txHash"
              placeholder="e.g. 0x1234... or tx hash"
              value={txHash}
              onChange={(e) => setTxHash(e.target.value)}
              autoFocus
              className="font-mono text-sm"
            />
            <p className="text-xs text-zinc-500">Paste the transaction hash you received from your wallet after sending the funds.</p>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              onClick={submitDeposit}
              disabled={submitting || !txHash.trim()}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-1" /> Submitting…</>
              ) : (
                <>Confirm Deposit</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Small helper components

function StepBadge({ active, done, number, label }: { active: boolean; done: boolean; number: number; label: string }) {
  return (
    <div className={`flex items-center gap-2 ${active || done ? 'text-red-700 dark:text-red-400' : 'text-zinc-400'}`}>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
        done ? 'bg-red-600 text-white' : active ? 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-2 border-red-500' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
      }`}>
        {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : number}
      </div>
      <span className="font-medium">{label}</span>
    </div>
  )
}

function InfoRow({ label, value, copyValue, icon, mono }: { label: string; value: string; copyValue?: string; icon?: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 min-w-0">
      <div className="flex items-center gap-2 text-xs text-zinc-500 shrink-0">
        {icon}
        <span>{label}</span>
      </div>
      <div className="flex items-center gap-2 min-w-0">
        <span className={`text-sm font-medium text-right break-all ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
        {copyValue ? <CopyButton value={copyValue} label="" /> : null}
      </div>
    </div>
  )
}
