# CAMPUS HELPER - auth acceptance tests (HTTP layer, ASCII only)
#
# Scope: this PR only (login / register / logout, session cookie, proxy redirects).
# The role guards (401 vs 403) and the booking flows are exercised by
# scripts/acceptance.ps1, which ships with feat/office-hour-booking because it needs
# the office-hours endpoints.
#
# Every check names the PRD acceptance id it verifies (CONTRIBUTING S9).
# Run: npm run dev, then  powershell -ExecutionPolicy Bypass -File scripts/acceptance-auth.ps1

$ErrorActionPreference = 'Continue'
$base = "http://127.0.0.1:3000"
$script:pass = 0
$script:fail = 0

function Check($name, $ok, $detail) {
  if ($ok) { $script:pass++ } else { $script:fail++ }
  "{0}  {1,-62} {2}" -f $(if ($ok) { "PASS" } else { "FAIL" }), $name, $detail
}

function Call($method, $path, $body, $ws, $noRedirect) {
  $params = @{ Uri = "$base$path"; Method = $method; TimeoutSec = 30; UseBasicParsing = $true }
  if ($ws) { $params.WebSession = $ws }
  if ($noRedirect) { $params.MaximumRedirection = 0 }
  if ($body) { $params.ContentType = 'application/json'; $params.Body = ($body | ConvertTo-Json -Compress) }
  try {
    $r = Invoke-WebRequest @params
    return @{ Status = [int]$r.StatusCode; Body = $r.Content }
  } catch {
    $resp = $_.Exception.Response
    if ($resp) {
      $code = [int]$resp.StatusCode
      $text = ""
      try {
        $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
        $text = $reader.ReadToEnd()
      } catch { }
      return @{ Status = $code; Body = $text }
    }
    return @{ Status = 0; Body = $_.Exception.Message }
  }
}

'=========== PROXY REDIRECTS (AUTH-AC-03) ==========='
foreach ($protected in @('/home', '/profile', '/services')) {
  $r = Call GET $protected $null $null $true
  Check "AUTH-AC-03 signed out on $protected redirects to /login" ($r.Status -eq 302 -or $r.Status -eq 307) "status=$($r.Status)"
}

$r = Call GET "/login" $null $null $true
Check "AUTH-AC-03 /login is reachable when signed out" ($r.Status -eq 200) "status=$($r.Status)"

''
'=========== LOGIN (AUTH-AC-01 / AUTH-AC-02) ==========='
$r = Call POST "/api/auth/login" @{ email = "student.mia@campus-helper.demo"; password = "wrong-password" } $null
Check "AUTH-AC-02 wrong password rejected (401)" ($r.Status -eq 401) "status=$($r.Status)"

$r = Call POST "/api/auth/login" @{ email = "nobody@campus-helper.demo"; password = "whatever1" } $null
Check "AUTH-AC-02 unknown email gives the same 401 (no enumeration)" ($r.Status -eq 401) "status=$($r.Status)"

$r = Call POST "/api/auth/login" @{ email = "not-an-email"; password = "whatever1" } $null
Check "AUTH-AC-01 malformed email rejected (400)" ($r.Status -eq 400) "status=$($r.Status)"

$mia = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$r = Call POST "/api/auth/login" @{ email = "student.mia@campus-helper.demo"; password = "Password123!" } $mia
Check "AUTH-AC-01 login with a valid account (200)" ($r.Status -eq 200) "status=$($r.Status)"
Check "AUTH-AC-05 session cookie was set" ($mia.Cookies.Count -gt 0) "cookies=$($mia.Cookies.Count)"

$r = Call POST "/api/auth/login" @{ email = "STUDENT.MIA@CAMPUS-HELPER.DEMO"; password = "Password123!" } $null
Check "AUTH-AC-01 email is case-insensitive" ($r.Status -eq 200) "status=$($r.Status)"

''
'=========== SESSION (AUTH-AC-05) ==========='
$r = Call GET "/home" $null $mia
Check "AUTH-AC-05 the session survives across requests" ($r.Status -eq 200) "status=$($r.Status)"

$r = Call GET "/login" $null $mia $true
Check "AUTH-AC-03 signed in on /login redirects to /home" ($r.Status -eq 302 -or $r.Status -eq 307) "status=$($r.Status)"

$r = Call GET "/home" $null $null $true
Check "AUTH-AC-05 a fresh session-less client is redirected again" ($r.Status -eq 302 -or $r.Status -eq 307) "status=$($r.Status)"

''
'=========== REGISTER (AUTH-AC-01) ==========='
$r = Call POST "/api/auth/register" @{ name = "T"; email = "weak@campus-helper.demo"; password = "123" } $null
Check "AUTH-AC-01 register rejects a short password (400)" ($r.Status -eq 400) "status=$($r.Status)"

$r = Call POST "/api/auth/register" @{ name = "Dup"; email = "student.mia@campus-helper.demo"; password = "Password123!" } $null
$code = $null
try { $code = ($r.Body | ConvertFrom-Json).error.code } catch { }
Check "AUTH-AC-01 duplicate email rejected with EMAIL_ALREADY_REGISTERED (409)" ($r.Status -eq 409 -and $code -eq "EMAIL_ALREADY_REGISTERED") "status=$($r.Status) code=$code"

$fresh = "pw-test-$([guid]::NewGuid().ToString('N').Substring(0,8))@campus-helper.demo"
$freshNo = "9999$((Get-Random -Maximum 9999))"
$newUser = New-Object Microsoft.PowerShell.Commands.WebRequestSession
# Deliberately try to mass-assign a role: the server must ignore it and create a STUDENT.
$r = Call POST "/api/auth/register" @{ name = "PW Test"; email = $fresh; password = "Password123!"; studentNo = $freshNo; role = "ADMIN" } $newUser
Check "AUTH-AC-01 a new account can be created (201)" ($r.Status -eq 201) "status=$($r.Status)"
Check "AUTH-AC-01 register signs the new user in immediately" ($newUser.Cookies.Count -gt 0) "cookies=$($newUser.Cookies.Count)"

$r = Call GET "/home" $null $newUser
Check "AUTH-AC-05 the freshly registered session works on /home" ($r.Status -eq 200) "status=$($r.Status)"

# A client-supplied role must be ignored. Checked in the database because the UI has no
# admin-only marker to look for.
$env:PGPASSWORD = "admin"
$psql = "C:\Program Files\PostgreSQL\18\bin\psql.exe"
$roleFile = Join-Path $env:TEMP "ch_role_check.sql"
$roleSql = "select role::text from ""User"" where ""studentNo"" = '$freshNo';"
[IO.File]::WriteAllText($roleFile, $roleSql, (New-Object Text.ASCIIEncoding))
$storedRole = $null
if (Test-Path $psql) {
  try { $storedRole = (((& $psql -h 127.0.0.1 -p 5433 -U postgres -d campus_helper -tA -f $roleFile) -join "") -replace '\s', '').Trim() } catch { }
}
if ($storedRole) {
  Check "AUTH-AC-01 a self-registered account is always a student (role cannot be mass-assigned)" ($storedRole -eq "STUDENT") "db role=$storedRole (request sent role=ADMIN)"
} else {
  'SKIP  AUTH-AC-01 role check needs psql on the default local cluster (5433)'
}

''
'=========== LOGOUT (AUTH-AC-04 / AUTH-AC-05) ==========='
$r = Call POST "/api/auth/logout" $null $mia
Check "AUTH-AC-05 logout succeeds (200)" ($r.Status -eq 200) "status=$($r.Status)"

$r = Call GET "/home" $null $mia $true
Check "AUTH-AC-03 protected page redirects again after logout" ($r.Status -eq 302 -or $r.Status -eq 307) "status=$($r.Status)"

$r = Call GET "/api/auth/logout?next=/login" $null $null $true
Check "AUTH-AC-05 GET /api/auth/logout clears a stale session and redirects" ($r.Status -eq 302 -or $r.Status -eq 307) "status=$($r.Status)"

''
'======================================================='
"RESULT: $($script:pass) passed, $($script:fail) failed"
'======================================================='
