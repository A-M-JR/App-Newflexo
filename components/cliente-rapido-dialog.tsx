"use client"

import { useState } from "react"
import { Loader2, Search, UserPlus } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { saveCliente, checkClienteDuplicado } from "@/lib/actions/clientes"
import { ehBrasil, maskCEP, maskCNPJ, maskTelefone, maskUF } from "@/lib/masks"

interface ClienteRapidoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Recebe o id do cliente recém-criado, para a tela já selecioná-lo. */
  onCriado: (clienteId: number) => void
}

const VAZIO = {
  razaoSocial: "",
  cnpj: "",
  telefone: "",
  cep: "",
  endereco: "",
  cidade: "",
  estado: "",
  pais: "Brasil",
}

/**
 * Cadastro enxuto de cliente, para abrir de dentro do orçamento sem perder o
 * que já foi digitado na tela. Traz só o que o orçamento e o PDF precisam; o
 * restante da ficha (comprador, e-mail, itens exclusivos, créditos) continua na
 * tela de clientes.
 *
 * As regras de obrigatoriedade são as mesmas do cadastro completo: cliente
 * brasileiro exige CNPJ, telefone, cidade e UF; cliente estrangeiro exige só o
 * país.
 */
export function ClienteRapidoDialog({ open, onOpenChange, onCriado }: ClienteRapidoDialogProps) {
  const [form, setForm] = useState({ ...VAZIO })
  const [estrangeiro, setEstrangeiro] = useState(false)
  const [erros, setErros] = useState<Record<string, string>>({})
  const [salvando, setSalvando] = useState(false)
  const [buscandoCnpj, setBuscandoCnpj] = useState(false)

  const fechar = (aberto: boolean) => {
    if (salvando) return
    if (!aberto) {
      setForm({ ...VAZIO })
      setEstrangeiro(false)
      setErros({})
    }
    onOpenChange(aberto)
  }

  const alterar = (campo: string, valor: string) => {
    setForm((prev) => ({ ...prev, [campo]: valor }))
    if (erros[campo]) setErros((prev) => ({ ...prev, [campo]: "" }))
  }

  const alternarEstrangeiro = (ligado: boolean) => {
    setEstrangeiro(ligado)
    setForm((prev) => ({ ...prev, pais: ligado ? "" : "Brasil", cep: ligado ? "" : prev.cep }))
    setErros({})
  }

  /** Preenche razão social e endereço a partir do CNPJ, como no cadastro completo. */
  const buscarCnpj = async () => {
    const digitos = form.cnpj.replace(/\D/g, "")
    if (digitos.length !== 14) {
      toast.error("Informe o CNPJ completo para buscar.")
      return
    }
    setBuscandoCnpj(true)
    try {
      const dup = await checkClienteDuplicado(form.cnpj)
      if (dup.exists) {
        setErros((prev) => ({ ...prev, cnpj: `Já cadastrado: ${dup.razaoSocial}` }))
        toast.error("Esse CNPJ já tem cadastro.")
        return
      }
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digitos}`)
      if (!res.ok) throw new Error("não encontrado")
      const data = await res.json()
      setForm((prev) => ({
        ...prev,
        razaoSocial: data.razao_social || prev.razaoSocial,
        endereco: [data.logradouro, data.numero].filter(Boolean).join(", ") || prev.endereco,
        cidade: data.municipio || prev.cidade,
        estado: data.uf || prev.estado,
        cep: data.cep ? maskCEP(String(data.cep)) : prev.cep,
        telefone: data.ddd_telefone_1 ? maskTelefone(String(data.ddd_telefone_1)) : prev.telefone,
      }))
      toast.success("Dados encontrados na Receita.")
    } catch {
      toast.error("Não consegui buscar esse CNPJ. Preencha manualmente.")
    } finally {
      setBuscandoCnpj(false)
    }
  }

  const salvar = async () => {
    if (salvando) return
    const novos: Record<string, string> = {}

    if (!form.razaoSocial.trim()) novos.razaoSocial = "Razão Social é obrigatória"

    if (estrangeiro) {
      if (!form.pais.trim()) novos.pais = "Informe o país do cliente"
      else if (ehBrasil(form.pais)) novos.pais = "Informe um país fora do Brasil"
    } else {
      if (!form.cnpj.trim()) novos.cnpj = "CNPJ é obrigatório"
      if (!form.telefone.trim()) novos.telefone = "Telefone é obrigatório"
      if (!form.cidade.trim()) novos.cidade = "Cidade é obrigatória"
      if (!form.estado.trim()) novos.estado = "UF é obrigatório"
    }

    if (Object.keys(novos).length > 0) {
      setErros(novos)
      return
    }

    setSalvando(true)
    try {
      const res: any = await saveCliente({ ...form })
      if (res?.error) {
        setErros((prev) => ({ ...prev, cnpj: res.error }))
        toast.error(res.error)
        return
      }
      toast.success(`${form.razaoSocial} cadastrado.`)
      onCriado(res.id)
      fechar(false)
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível salvar o cliente.")
    } finally {
      setSalvando(false)
    }
  }

  const Erro = ({ campo }: { campo: string }) =>
    erros[campo] ? <p className="text-xs text-destructive">{erros[campo]}</p> : null

  return (
    <Dialog open={open} onOpenChange={fechar}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="size-5 text-primary" />
            Novo cliente
          </DialogTitle>
          <DialogDescription>
            Cadastro rápido, sem sair do orçamento. Os demais dados da ficha você completa depois na tela de clientes.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2 sm:grid-cols-12">
          <div className="sm:col-span-12 flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
            <div className="min-w-0">
              <Label htmlFor="rapido-estrangeiro" className="text-sm font-medium">Cliente estrangeiro</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Dispensa CNPJ, CEP e UF.</p>
            </div>
            <Switch id="rapido-estrangeiro" checked={estrangeiro} onCheckedChange={alternarEstrangeiro} />
          </div>

          <div className="sm:col-span-7 space-y-2">
            <Label htmlFor="rapido-doc">{estrangeiro ? "Documento / RUC" : "CNPJ *"}</Label>
            <div className="flex gap-2">
              <Input
                id="rapido-doc"
                value={form.cnpj}
                onChange={(e) => alterar("cnpj", estrangeiro ? e.target.value : maskCNPJ(e.target.value))}
                maxLength={estrangeiro ? 30 : 18}
                placeholder={estrangeiro ? "80012345-6" : "00.000.000/0000-00"}
                className="bg-muted/30"
              />
              {!estrangeiro && (
                <Button type="button" variant="outline" onClick={buscarCnpj} disabled={buscandoCnpj} className="shrink-0">
                  {buscandoCnpj ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                </Button>
              )}
            </div>
            <Erro campo="cnpj" />
          </div>

          <div className="sm:col-span-5 space-y-2">
            <Label htmlFor="rapido-tel">Telefone{estrangeiro ? "" : " *"}</Label>
            <Input
              id="rapido-tel"
              value={form.telefone}
              onChange={(e) => alterar("telefone", estrangeiro ? e.target.value : maskTelefone(e.target.value))}
              maxLength={estrangeiro ? 25 : 15}
              className="bg-muted/30"
            />
            <Erro campo="telefone" />
          </div>

          <div className="sm:col-span-12 space-y-2">
            <Label htmlFor="rapido-razao">Razão Social *</Label>
            <Input
              id="rapido-razao"
              value={form.razaoSocial}
              onChange={(e) => alterar("razaoSocial", e.target.value)}
              placeholder="Ex: Industria e Comercio XYZ Ltda"
              className="bg-muted/30"
            />
            <Erro campo="razaoSocial" />
          </div>

          <div className="sm:col-span-12 space-y-2">
            <Label htmlFor="rapido-end">Endereço</Label>
            <Input
              id="rapido-end"
              value={form.endereco}
              onChange={(e) => alterar("endereco", e.target.value)}
              placeholder="Av. Principal, 100"
              className="bg-muted/30"
            />
          </div>

          <div className="sm:col-span-3 space-y-2">
            <Label htmlFor="rapido-pais">País{estrangeiro ? " *" : ""}</Label>
            <Input
              id="rapido-pais"
              value={form.pais}
              onChange={(e) => alterar("pais", e.target.value)}
              maxLength={40}
              placeholder={estrangeiro ? "Ex: Paraguai" : "Brasil"}
              className="bg-muted/30"
            />
            <Erro campo="pais" />
          </div>

          <div className="sm:col-span-3 space-y-2">
            <Label htmlFor="rapido-cep">CEP</Label>
            <Input
              id="rapido-cep"
              value={form.cep}
              onChange={(e) => alterar("cep", estrangeiro ? e.target.value : maskCEP(e.target.value))}
              maxLength={estrangeiro ? 15 : 9}
              className="bg-muted/30"
            />
          </div>

          <div className="sm:col-span-4 space-y-2">
            <Label htmlFor="rapido-cidade">Cidade{estrangeiro ? "" : " *"}</Label>
            <Input
              id="rapido-cidade"
              value={form.cidade}
              onChange={(e) => alterar("cidade", e.target.value)}
              className="bg-muted/30"
            />
            <Erro campo="cidade" />
          </div>

          <div className="sm:col-span-2 space-y-2">
            <Label htmlFor="rapido-uf">{estrangeiro ? "Estado" : "UF *"}</Label>
            <Input
              id="rapido-uf"
              value={form.estado}
              onChange={(e) => alterar("estado", estrangeiro ? e.target.value : maskUF(e.target.value))}
              maxLength={estrangeiro ? 40 : 2}
              className={`bg-muted/30 ${estrangeiro ? "" : "uppercase"}`}
            />
            <Erro campo="estado" />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => fechar(false)} disabled={salvando}>
            Cancelar
          </Button>
          <Button type="button" onClick={salvar} disabled={salvando}>
            {salvando ? (
              <><Loader2 className="size-4 mr-1.5 animate-spin" /> Salvando...</>
            ) : (
              <><UserPlus className="size-4 mr-1.5" /> Cadastrar e usar</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
