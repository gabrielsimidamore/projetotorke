import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import logo from '@/assets/logo-torke.jpeg';

const Login = () => {
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      toast({ title: 'Preencha todos os campos', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const { error } = await signIn(loginEmail, loginPassword);
    if (error) {
      toast({ title: 'Credenciais inválidas', description: 'Verifique seu email e senha.', variant: 'destructive' });
    }
    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupEmail || !signupPassword) {
      toast({ title: 'Preencha todos os campos', variant: 'destructive' });
      return;
    }
    if (signupPassword.length < 6) {
      toast({ title: 'Senha muito curta', description: 'Mínimo de 6 caracteres.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const { error } = await signUp(signupEmail, signupPassword);
    if (error) {
      toast({ title: 'Erro ao criar conta', description: error.message, variant: 'destructive' });
      setLoading(false);
      return;
    }
    // Auto-login após cadastro
    const { error: loginError } = await signIn(signupEmail, signupPassword);
    if (loginError) {
      toast({ title: 'Conta criada!', description: 'Faça login para continuar.' });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="flex flex-col items-center gap-3 mb-8">
          <img src={logo} alt="Torke 360" className="w-20 h-20 rounded-xl object-contain" />
          <div className="text-center">
            <h1 className="text-xl font-bold text-foreground">Torke Assistem</h1>
            <p className="text-xs text-muted-foreground">Automações com IA</p>
          </div>
        </div>

        <Card>
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-lg">Acesse sua conta</CardTitle>
            <CardDescription>Entre ou crie uma conta para continuar</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Criar conta</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input id="login-email" type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="seu@email.com" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Senha</Label>
                    <Input id="login-password" type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="••••••••" required />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Entrar
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input id="signup-email" type="email" value={signupEmail} onChange={e => setSignupEmail(e.target.value)} placeholder="seu@email.com" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Senha</Label>
                    <Input id="signup-password" type="password" value={signupPassword} onChange={e => setSignupPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required minLength={6} />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Criar conta
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
