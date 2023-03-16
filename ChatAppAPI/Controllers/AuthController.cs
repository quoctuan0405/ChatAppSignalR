using ChatAppAPI.Data;
using ChatAppAPI.Model;
using ChatAppAPI.Payload;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace ChatAppAPI.Controllers
{
    [Route("api/auth")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly SignInManager<ApplicationUser> _signInManager;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly IConfiguration _configuration;
        private readonly ApplicationDbContext _applicationDbContext;

        public AuthController(ApplicationDbContext applicationDbContext, SignInManager<ApplicationUser> signInManager, UserManager<ApplicationUser> userManager, IConfiguration configuration)
        {
            _signInManager = signInManager;
            _userManager = userManager;
            _configuration = configuration;
            _applicationDbContext = applicationDbContext;
        }

        [HttpPost("signup")]
        public async Task<IActionResult> Signup([FromBody] LoginPayload model)
        {
            var user = new ApplicationUser { UserName = model.Username };
            var result = await _userManager.CreateAsync(user, model.Password);
            if (result.Succeeded)
            {
                var claims = new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, user.Id),
                    new Claim(ClaimTypes.Name, user.UserName)
                };
                var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]));
                var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
                var token = new JwtSecurityToken(
                    issuer: null,
                    audience: null,
                    claims: claims,
                    expires: DateTime.Now.AddMinutes(30),
                    signingCredentials: creds);
                return Ok(new { token = new JwtSecurityTokenHandler().WriteToken(token) });
            }
            return BadRequest(result.Errors);
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginPayload model)
        {
            var result = await _signInManager.PasswordSignInAsync(model.Username, model.Password, false, false);
            if (result.Succeeded)
            {
                var user = await _userManager.FindByNameAsync(model.Username);
                var claims = new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, user.Id),
                    new Claim(ClaimTypes.Name, user.UserName)
                };

                var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]));
                var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
                var token = new JwtSecurityToken(
                    issuer: null,
                    audience: null,
                    claims: claims,
                    expires: DateTime.Now.AddMinutes(30),
                    signingCredentials: creds
                );
                return Ok(new { token = new JwtSecurityTokenHandler().WriteToken(token) });
            }
            return Unauthorized();
        }

        [Authorize]
        [HttpGet("protected")]
        public async Task<IActionResult> Protected()
        {
            var username = User.Identity.Name;
            ApplicationUser user = _applicationDbContext.Users.FirstOrDefault(user => user.UserName == username);

            return Ok(new {userId = user.Id});
        }
    }
}
