import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

function strongPassword(control: AbstractControl): ValidationErrors | null {
  const password = String(control.value || '');
  const valid = password.length >= 8
    && /[A-Z]/.test(password)
    && /\d/.test(password)
    && /[^A-Za-z0-9]/.test(password);
  return valid ? null : { strongPassword: true };
}

@Component({
  selector: 'app-cadastro',
  standalone: false,
  templateUrl: './cadastro.component.html',
})
export class CadastroComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly changeDetector = inject(ChangeDetectorRef);

  readonly form = this.formBuilder.nonNullable.group({
    fullName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, strongPassword]],
    confirmPassword: ['', Validators.required],
    accountType: ['investidor', Validators.required],
  });
  message = '';
  messageType: 'error' | 'success' = 'error';
  loading = false;
  passwordVisible = false;
  confirmPasswordVisible = false;

  get password(): string {
    return this.form.controls.password.value;
  }

  get nameInvalid(): boolean {
    return this.form.controls.fullName.touched && this.form.controls.fullName.invalid;
  }

  get emailInvalid(): boolean {
    return this.form.controls.email.touched && this.form.controls.email.invalid;
  }

  get passwordInvalid(): boolean {
    return this.form.controls.password.touched && this.form.controls.password.invalid;
  }

  get confirmPasswordInvalid(): boolean {
    return this.form.controls.confirmPassword.touched && this.form.controls.confirmPassword.invalid;
  }

  async submit(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.loading) {
      return;
    }

    const { fullName, email, password, confirmPassword, accountType } = this.form.getRawValue();
    if (password !== confirmPassword) {
      this.showMessage('As senhas não coincidem.');
      return;
    }

    this.loading = true;
    this.message = '';
    try {
      const created = await this.auth.signUp(
        fullName.trim(),
        email.trim(),
        password,
        accountType,
        `${window.location.origin}/login`,
      );
      if (!created) {
        this.showMessage('Este e-mail já está cadastrado. Faça login ou recupere sua senha.');
        return;
      }

      this.form.reset({ fullName: '', email: '', password: '', confirmPassword: '', accountType: 'investidor' });
      this.showMessage('Cadastro realizado com sucesso! Você já pode entrar.', 'success');
      window.setTimeout(() => this.router.navigateByUrl('/login'), 1800);
    } catch (error) {
      console.error('Erro ao cadastrar usuário:', error);
      this.showMessage(this.auth.mapError(error));
    } finally {
      this.loading = false;
      this.changeDetector.markForCheck();
    }
  }

  private showMessage(message: string, type: 'error' | 'success' = 'error'): void {
    this.message = message;
    this.messageType = type;
    this.changeDetector.markForCheck();
  }
}
